import Dexie, { type Table } from 'dexie';
import type {
  Paciente,
  Medico,
  Enfermeiro,
  Medicamento,
  Historico,
  SessionUser,
} from './api';

export type SyncStatus = 'LOCAL_DRAFT' | 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';

export type SyncEntityType =
  | 'PACIENTE'
  | 'MEDICO'
  | 'ENFERMEIRO'
  | 'MEDICAMENTO'
  | 'CONSULTA';

export type SyncOperationType = 'CREATE' | 'UPDATE';

export interface ScopedEntity<T> {
  pk: string; // `${userScope}:${id}`
  userScope: string;
  id: number;
  data: T;
  syncStatus: SyncStatus;
  updatedAt: number;
  errorMessage?: string;
}

export interface SyncQueueItem {
  queueId?: number;
  userScope: string;
  idempotencyKey: string;
  entityType: SyncEntityType;
  operation: SyncOperationType;
  endpoint: string;
  method: 'POST' | 'PUT';
  localEntityId: number;
  payload: Record<string, unknown>;
  status: 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClinicalDraftRecord {
  draftKey: string; // `${userScope}:consulta-draft`
  userScope: string;
  tipoProfissional: 'medico' | 'enfermeiro';
  profissionalId: string;
  pacienteId: string;
  medicamentoId: string;
  tipoCalculo: 'dose' | 'volume' | 'gotas';
  prescricao: string;
  resultado?: {
    valor: string;
    unidade: string;
    formula: string;
    paciente: string;
    medicamento: string;
    peso: number;
    dosagem: number;
    doseMaximaExcedida?: boolean;
  } | null;
  status: SyncStatus;
  updatedAt: number;
}

const SENSITIVE_KEYS = new Set([
  'senha',
  'password',
  'token',
  'authorization',
  'jwt',
  'secret',
]);

/**
 * Remove recursivamente qualquer campo sensível antes de gravar no IndexedDB.
 * Garante que senhas, tokens e segredos nunca sejam persistidos na fila ou cache local.
 */
export function sanitizeForOfflineStorage<T>(input: T): T {
  if (input === null || input === undefined || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForOfflineStorage(item)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    clean[key] = sanitizeForOfflineStorage(value);
  }
  return clean as T;
}

export function getUserScope(user: { id?: number; username: string } | null | undefined): string {
  if (!user || !user.username) {
    return 'anonymous';
  }
  return `${user.id ?? 0}:${user.username.trim().toLowerCase()}`;
}

export class DoseCertaOfflineDB extends Dexie {
  pacientes!: Table<ScopedEntity<Paciente>, string>;
  medicos!: Table<ScopedEntity<Medico>, string>;
  enfermeiros!: Table<ScopedEntity<Enfermeiro>, string>;
  medicamentos!: Table<ScopedEntity<Medicamento>, string>;
  historico!: Table<ScopedEntity<Historico>, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  clinicalDrafts!: Table<ClinicalDraftRecord, string>;

  constructor() {
    super('DoseCertaOfflineDB');
    this.version(1).stores({
      pacientes: 'pk, userScope, id, syncStatus, updatedAt',
      medicos: 'pk, userScope, id, syncStatus, updatedAt',
      enfermeiros: 'pk, userScope, id, syncStatus, updatedAt',
      medicamentos: 'pk, userScope, id, syncStatus, updatedAt',
      historico: 'pk, userScope, id, syncStatus, updatedAt',
      syncQueue:
        '++queueId, userScope, idempotencyKey, status, entityType, localEntityId, nextRetryAt, createdAt',
      clinicalDrafts: 'draftKey, userScope, updatedAt',
    });
  }
}

export const offlineDb = new DoseCertaOfflineDB();

export async function saveScopedEntities<T extends { id?: number }>(
  table: Table<ScopedEntity<T>, string>,
  userScope: string,
  items: T[],
  syncStatus: SyncStatus = 'SINCRONIZADO'
): Promise<void> {
  if (!userScope || userScope === 'anonymous') return;
  const now = Date.now();
  const existingPending = await table
    .where('userScope')
    .equals(userScope)
    .filter((item) => item.syncStatus === 'PENDENTE' || item.syncStatus === 'LOCAL_DRAFT' || item.syncStatus === 'ERRO')
    .toArray();
  const pendingIds = new Set(existingPending.map((e) => e.id));

  const records: ScopedEntity<T>[] = [];
  for (const raw of items) {
    if (raw.id === undefined || raw.id === null) continue;
    if (pendingIds.has(raw.id) && syncStatus === 'SINCRONIZADO') {
      continue;
    }
    const sanitized = sanitizeForOfflineStorage(raw);
    records.push({
      pk: `${userScope}:${raw.id}`,
      userScope,
      id: raw.id,
      data: sanitized,
      syncStatus,
      updatedAt: now,
    });
  }

  await offlineDb.transaction('rw', table, async () => {
    const allForUser = await table.where('userScope').equals(userScope).toArray();
    const serverIds = new Set(items.map((i) => i.id));
    const toDelete = allForUser
      .filter(
        (rec) =>
          rec.id > 0 &&
          rec.syncStatus === 'SINCRONIZADO' &&
          !serverIds.has(rec.id)
      )
      .map((rec) => rec.pk);
    if (toDelete.length > 0) {
      await table.bulkDelete(toDelete);
    }
    if (records.length > 0) {
      await table.bulkPut(records);
    }
  });
}

export async function putScopedEntity<T extends { id?: number }>(
  table: Table<ScopedEntity<T>, string>,
  userScope: string,
  item: T,
  syncStatus: SyncStatus,
  errorMessage?: string
): Promise<void> {
  if (!userScope || userScope === 'anonymous' || item.id === undefined) return;
  const sanitized = sanitizeForOfflineStorage(item);
  await table.put({
    pk: `${userScope}:${item.id}`,
    userScope,
    id: item.id,
    data: sanitized,
    syncStatus,
    updatedAt: Date.now(),
    errorMessage,
  });
}

export async function getScopedEntities<T>(
  table: Table<ScopedEntity<T>, string>,
  userScope: string
): Promise<Array<T & { _syncStatus?: SyncStatus; _syncError?: string }>> {
  if (!userScope || userScope === 'anonymous') return [];
  const rows = await table.where('userScope').equals(userScope).toArray();
  rows.sort((a, b) => a.id - b.id);
  return rows.map((r) => ({
    ...r.data,
    _syncStatus: r.syncStatus,
    _syncError: r.errorMessage,
  }));
}

export async function clearUserOfflineData(userScope?: string): Promise<void> {
  if (!userScope) {
    await Promise.all([
      offlineDb.pacientes.clear(),
      offlineDb.medicos.clear(),
      offlineDb.enfermeiros.clear(),
      offlineDb.medicamentos.clear(),
      offlineDb.historico.clear(),
      offlineDb.syncQueue.clear(),
      offlineDb.clinicalDrafts.clear(),
    ]);
    return;
  }
  await Promise.all([
    offlineDb.pacientes.where('userScope').equals(userScope).delete(),
    offlineDb.medicos.where('userScope').equals(userScope).delete(),
    offlineDb.enfermeiros.where('userScope').equals(userScope).delete(),
    offlineDb.medicamentos.where('userScope').equals(userScope).delete(),
    offlineDb.historico.where('userScope').equals(userScope).delete(),
    offlineDb.syncQueue.where('userScope').equals(userScope).delete(),
    offlineDb.clinicalDrafts.where('userScope').equals(userScope).delete(),
  ]);
}
