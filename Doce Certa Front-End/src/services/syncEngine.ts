import {
  offlineDb,
  sanitizeForOfflineStorage,
  saveScopedEntities,
  putScopedEntity,
  getScopedEntities,
  type SyncEntityType,
  type SyncOperationType,
  type SyncQueueItem,
  type SyncStatus,
} from './offlineDb';
import {
  makeRequest,
  ApiHttpError,
  isNetworkOrColdStartError,
  historicoService,
  type Paciente,
  type Medico,
  type Enfermeiro,
  type Medicamento,
  type Historico,
} from './api';

export interface SyncSummary {
  isOnline: boolean;
  isSyncing: boolean;
  serverWarmingUp: boolean;
  pendingCount: number;
  errorCount: number;
  draftCount: number;
  lastSyncedAt: number | null;
  items: SyncQueueItem[];
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

let isCurrentlySyncing = false;
let lastSyncedTimestamp: number | null = null;
let serverWarmingUpFlag = false;

export function notifySyncStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dosecerta:sync-updated'));
  }
}

export function setServerWarmingUp(warmingUp: boolean): void {
  if (serverWarmingUpFlag !== warmingUp) {
    serverWarmingUpFlag = warmingUp;
    notifySyncStateChanged();
  }
}

export async function getSyncSummary(userScope: string): Promise<SyncSummary> {
  if (!userScope || userScope === 'anonymous') {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      serverWarmingUp: serverWarmingUpFlag,
      pendingCount: 0,
      errorCount: 0,
      draftCount: 0,
      lastSyncedAt: lastSyncedTimestamp,
      items: [],
    };
  }

  const [queueItems, drafts] = await Promise.all([
    offlineDb.syncQueue.where('userScope').equals(userScope).toArray(),
    offlineDb.clinicalDrafts.where('userScope').equals(userScope).toArray(),
  ]);

  const pendingCount = queueItems.filter((i) => i.status === 'PENDENTE').length;
  const errorCount = queueItems.filter((i) => i.status === 'ERRO').length;
  const draftCount = drafts.filter(
    (d) => Boolean(d.pacienteId || d.medicamentoId || d.prescricao)
  ).length;

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: isCurrentlySyncing,
    serverWarmingUp: serverWarmingUpFlag,
    pendingCount,
    errorCount,
    draftCount,
    lastSyncedAt: lastSyncedTimestamp,
    items: queueItems.sort((a, b) => b.createdAt - a.createdAt),
  };
}

export async function loadCachedDataForUser(userScope: string): Promise<{
  pacientes: Paciente[];
  medicos: Medico[];
  enfermeiros: Enfermeiro[];
  medicamentos: Medicamento[];
  historico: Historico[];
  hasCachedData: boolean;
}> {
  const [pacientes, medicos, enfermeiros, medicamentos, historico] = await Promise.all([
    getScopedEntities(offlineDb.pacientes, userScope),
    getScopedEntities(offlineDb.medicos, userScope),
    getScopedEntities(offlineDb.enfermeiros, userScope),
    getScopedEntities(offlineDb.medicamentos, userScope),
    getScopedEntities(offlineDb.historico, userScope),
  ]);

  const hasCachedData =
    pacientes.length > 0 ||
    medicos.length > 0 ||
    enfermeiros.length > 0 ||
    medicamentos.length > 0 ||
    historico.length > 0;

  return {
    pacientes,
    medicos,
    enfermeiros,
    medicamentos,
    historico: historico.sort((a, b) => b.id - a.id),
    hasCachedData,
  };
}

export async function saveServerSnapshotForUser(
  userScope: string,
  snapshot: {
    pacientes?: Paciente[];
    medicos?: Medico[];
    enfermeiros?: Enfermeiro[];
    medicamentos?: Medicamento[];
    historico?: Historico[];
  }
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (snapshot.pacientes) {
    tasks.push(saveScopedEntities(offlineDb.pacientes, userScope, snapshot.pacientes, 'SINCRONIZADO'));
  }
  if (snapshot.medicos) {
    tasks.push(saveScopedEntities(offlineDb.medicos, userScope, snapshot.medicos, 'SINCRONIZADO'));
  }
  if (snapshot.enfermeiros) {
    tasks.push(
      saveScopedEntities(offlineDb.enfermeiros, userScope, snapshot.enfermeiros, 'SINCRONIZADO')
    );
  }
  if (snapshot.medicamentos) {
    tasks.push(
      saveScopedEntities(offlineDb.medicamentos, userScope, snapshot.medicamentos, 'SINCRONIZADO')
    );
  }
  if (snapshot.historico) {
    tasks.push(saveScopedEntities(offlineDb.historico, userScope, snapshot.historico, 'SINCRONIZADO'));
  }
  await Promise.all(tasks);
  lastSyncedTimestamp = Date.now();
  notifySyncStateChanged();
}

function getTableForEntityType(entityType: SyncEntityType) {
  switch (entityType) {
    case 'PACIENTE':
      return offlineDb.pacientes;
    case 'MEDICO':
      return offlineDb.medicos;
    case 'ENFERMEIRO':
      return offlineDb.enfermeiros;
    case 'MEDICAMENTO':
      return offlineDb.medicamentos;
    case 'CONSULTA':
      return offlineDb.historico;
  }
}

export async function enqueueOfflineOperation<T extends { id: number }>(params: {
  userScope: string;
  entityType: SyncEntityType;
  operation: SyncOperationType;
  endpoint: string;
  method: 'POST' | 'PUT';
  localEntity: T;
  payload: Record<string, unknown>;
  initialSyncStatus?: SyncStatus;
}): Promise<SyncQueueItem> {
  const {
    userScope,
    entityType,
    operation,
    endpoint,
    method,
    localEntity,
    payload,
    initialSyncStatus = 'PENDENTE',
  } = params;

  const cleanPayload = sanitizeForOfflineStorage(payload);
  const table = getTableForEntityType(entityType) as any;

  await putScopedEntity(table, userScope, localEntity, initialSyncStatus);

  // Coalescência: se já existe item PENDENTE para a mesma entidade local, atualiza o payload sem duplicar na fila
  const existingQueueItems = await offlineDb.syncQueue
    .where('userScope')
    .equals(userScope)
    .filter(
      (item) =>
        item.entityType === entityType &&
        item.localEntityId === localEntity.id &&
        item.status === 'PENDENTE'
    )
    .toArray();

  const now = Date.now();

  if (existingQueueItems.length > 0) {
    const first = existingQueueItems[0];
    const mergedPayload = { ...first.payload, ...cleanPayload };
    await offlineDb.syncQueue.update(first.queueId!, {
      payload: mergedPayload,
      updatedAt: now,
      nextRetryAt: now,
    });
    notifySyncStateChanged();
    return { ...first, payload: mergedPayload, updatedAt: now };
  }

  const queueItem: SyncQueueItem = {
    userScope,
    idempotencyKey: generateIdempotencyKey(),
    entityType,
    operation,
    endpoint,
    method,
    localEntityId: localEntity.id,
    payload: cleanPayload,
    status: 'PENDENTE',
    attempts: 0,
    nextRetryAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const queueId = await offlineDb.syncQueue.add(queueItem);
  notifySyncStateChanged();
  return { ...queueItem, queueId };
}

export async function retryFailedQueueItems(userScope: string): Promise<void> {
  const failedItems = await offlineDb.syncQueue
    .where('userScope')
    .equals(userScope)
    .filter((i) => i.status === 'ERRO')
    .toArray();

  const now = Date.now();
  for (const item of failedItems) {
    if (item.queueId !== undefined) {
      await offlineDb.syncQueue.update(item.queueId, {
        status: 'PENDENTE',
        attempts: 0,
        nextRetryAt: now,
        lastError: undefined,
        updatedAt: now,
      });
      const table = getTableForEntityType(item.entityType) as any;
      const pk = `${userScope}:${item.localEntityId}`;
      const existing = await table.get(pk);
      if (existing) {
        await table.update(pk, { syncStatus: 'PENDENTE', errorMessage: undefined });
      }
    }
  }
  notifySyncStateChanged();
}

export async function discardQueueItem(userScope: string, queueId: number): Promise<void> {
  const item = await offlineDb.syncQueue.get(queueId);
  if (!item || item.userScope !== userScope) return;
  await offlineDb.syncQueue.delete(queueId);
  if (item.localEntityId < 0) {
    const table = getTableForEntityType(item.entityType) as any;
    await table.delete(`${userScope}:${item.localEntityId}`);
  }
  notifySyncStateChanged();
}

async function replaceTempIdReferencesInQueue(
  userScope: string,
  entityType: SyncEntityType,
  oldLocalId: number,
  newServerId: number
): Promise<void> {
  if (oldLocalId >= 0) return;
  const pendingItems = await offlineDb.syncQueue
    .where('userScope')
    .equals(userScope)
    .filter((i) => i.status === 'PENDENTE')
    .toArray();

  for (const item of pendingItems) {
    let changed = false;
    const updatedPayload = { ...item.payload };

    if (entityType === 'PACIENTE' && updatedPayload.pacienteId === oldLocalId) {
      updatedPayload.pacienteId = newServerId;
      changed = true;
    } else if (entityType === 'MEDICO' && updatedPayload.medicoId === oldLocalId) {
      updatedPayload.medicoId = newServerId;
      changed = true;
    } else if (entityType === 'ENFERMEIRO' && updatedPayload.enfermeiroId === oldLocalId) {
      updatedPayload.enfermeiroId = newServerId;
      changed = true;
    } else if (entityType === 'MEDICAMENTO' && updatedPayload.medicamentoId === oldLocalId) {
      updatedPayload.medicamentoId = newServerId;
      changed = true;
    }

    if (changed && item.queueId !== undefined) {
      await offlineDb.syncQueue.update(item.queueId, {
        payload: updatedPayload,
        updatedAt: Date.now(),
      });
    }
  }
}

export async function processSyncQueue(
  userScope: string,
  options: { forceNow?: boolean } = {}
): Promise<{ syncedCount: number; failedCount: number }> {
  if (!userScope || userScope === 'anonymous' || isCurrentlySyncing) {
    return { syncedCount: 0, failedCount: 0 };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const now = Date.now();
  const pendingItems = await offlineDb.syncQueue
    .where('userScope')
    .equals(userScope)
    .filter(
      (item) =>
        item.status === 'PENDENTE' && (options.forceNow === true || item.nextRetryAt <= now)
    )
    .toArray();

  if (pendingItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Ordena por ordem de criação (FIFO) para preservar dependências (ex: criar paciente antes de consulta)
  pendingItems.sort((a, b) => a.createdAt - b.createdAt);

  isCurrentlySyncing = true;
  notifySyncStateChanged();

  let syncedCount = 0;
  let failedCount = 0;

  try {
    for (const item of pendingItems) {
      try {
        const responseData = await makeRequest<any>(item.endpoint, {
          method: item.method,
          body: JSON.stringify(item.payload),
          idempotencyKey: item.idempotencyKey,
        });

        setServerWarmingUp(false);

        const table = getTableForEntityType(item.entityType) as any;
        const oldPk = `${userScope}:${item.localEntityId}`;

        if (item.entityType === 'CONSULTA') {
          await table.delete(oldPk);
          try {
            const freshHistorico = await historicoService.listar();
            await saveScopedEntities(
              offlineDb.historico,
              userScope,
              freshHistorico,
              'SINCRONIZADO'
            );
          } catch {
            // Se falhar apenas o refresh do histórico, remove o rascunho pendente pois o POST /consultas já confirmou
          }
          // Atualiza rascunho clínico caso estivesse pendente
          const draftKey = `${userScope}:consulta-draft`;
          const draft = await offlineDb.clinicalDrafts.get(draftKey);
          if (draft && draft.status === 'PENDENTE') {
            await offlineDb.clinicalDrafts.update(draftKey, {
              status: 'SINCRONIZADO',
              updatedAt: Date.now(),
            });
          }
        } else if (responseData && typeof responseData.id === 'number') {
          if (item.localEntityId < 0) {
            await table.delete(oldPk);
            await replaceTempIdReferencesInQueue(
              userScope,
              item.entityType,
              item.localEntityId,
              responseData.id
            );
          }
          await putScopedEntity(table, userScope, responseData, 'SINCRONIZADO');
        } else {
          const existing = await table.get(oldPk);
          if (existing) {
            await table.update(oldPk, { syncStatus: 'SINCRONIZADO', errorMessage: undefined });
          }
        }

        if (item.queueId !== undefined) {
          await offlineDb.syncQueue.delete(item.queueId);
        }
        syncedCount++;
      } catch (err) {
        if (isNetworkOrColdStartError(err)) {
          // Falha transitória (offline / Render cold start): agenda retry com exponential backoff
          const attempts = item.attempts + 1;
          const backoffMs = Math.min(60000, 1000 * Math.pow(2, Math.min(attempts, 6)));
          if (item.queueId !== undefined) {
            await offlineDb.syncQueue.update(item.queueId, {
              attempts,
              nextRetryAt: Date.now() + backoffMs,
              lastError:
                err instanceof Error
                  ? err.message
                  : 'Servidor indisponível no momento. Tentaremos novamente automaticamente.',
              updatedAt: Date.now(),
            });
          }
          setServerWarmingUp(true);
          // Interrompe o lote atual pois o servidor está inacessível
          break;
        } else {
          // Conflito ou erro de validação definitivo (400, 404, 409, 422, 500): marca como ERRO para ação do usuário
          const errorMessage =
            err instanceof ApiHttpError || err instanceof Error
              ? err.message
              : 'Conflito ou erro de validação ao sincronizar com o servidor.';
          if (item.queueId !== undefined) {
            await offlineDb.syncQueue.update(item.queueId, {
              status: 'ERRO',
              attempts: item.attempts + 1,
              lastError: errorMessage,
              updatedAt: Date.now(),
            });
          }
          const table = getTableForEntityType(item.entityType) as any;
          const pk = `${userScope}:${item.localEntityId}`;
          const existing = await table.get(pk);
          if (existing) {
            await table.update(pk, {
              syncStatus: 'ERRO',
              errorMessage,
              updatedAt: Date.now(),
            });
          }
          failedCount++;
        }
      }
    }
    if (syncedCount > 0) {
      lastSyncedTimestamp = Date.now();
    }
  } finally {
    isCurrentlySyncing = false;
    notifySyncStateChanged();
  }

  return { syncedCount, failedCount };
}
