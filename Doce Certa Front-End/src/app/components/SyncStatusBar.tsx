import { useEffect, useState, useCallback } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  Clock,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/button';
import type { SyncStatus } from '../../services/offlineDb';
import {
  getSyncSummary,
  retryFailedQueueItems,
  discardQueueItem,
  type SyncSummary,
} from '../../services/syncEngine';

export function SyncBadge({
  status,
  errorMessage,
}: {
  status?: SyncStatus;
  errorMessage?: string;
}) {
  const effectiveStatus = status ?? 'SINCRONIZADO';

  if (effectiveStatus === 'LOCAL_DRAFT') {
    return (
      <span
        data-testid="sync-badge-local"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800"
      >
        <HardDrive className="w-3 h-3" />
        Salvo neste dispositivo
      </span>
    );
  }

  if (effectiveStatus === 'PENDENTE') {
    return (
      <span
        data-testid="sync-badge-pendente"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
      >
        <Clock className="w-3 h-3" />
        Pendente
      </span>
    );
  }

  if (effectiveStatus === 'ERRO') {
    return (
      <span
        data-testid="sync-badge-erro"
        title={errorMessage || 'Erro ao sincronizar com o servidor'}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800"
      >
        <AlertTriangle className="w-3 h-3" />
        Erro
      </span>
    );
  }

  return (
    <span
      data-testid="sync-badge-sincronizado"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
    >
      <CheckCircle2 className="w-3 h-3" />
      Sincronizado
    </span>
  );
}

interface SyncStatusBarProps {
  userScope: string;
  onSyncNow: () => Promise<void>;
}

export default function SyncStatusBar({ userScope, onSyncNow }: SyncStatusBarProps) {
  const [summary, setSummary] = useState<SyncSummary>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    serverWarmingUp: false,
    pendingCount: 0,
    errorCount: 0,
    draftCount: 0,
    lastSyncedAt: null,
    items: [],
  });
  const [showDetails, setShowDetails] = useState(false);

  const refreshSummary = useCallback(async () => {
    const next = await getSyncSummary(userScope);
    setSummary(next);
  }, [userScope]);

  useEffect(() => {
    refreshSummary();
    const handleSyncUpdated = () => {
      refreshSummary();
    };
    const handleOnline = () => {
      refreshSummary();
    };
    const handleOffline = () => {
      refreshSummary();
    };

    window.addEventListener('dosecerta:sync-updated', handleSyncUpdated);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('dosecerta:sync-updated', handleSyncUpdated);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshSummary]);

  const handleRetryErrors = async () => {
    await retryFailedQueueItems(userScope);
    await onSyncNow();
  };

  const handleDiscardItem = async (queueId?: number) => {
    if (queueId === undefined) return;
    await discardQueueItem(userScope, queueId);
    await onSyncNow();
  };

  const getPrimaryStateLabel = (): {
    status: SyncStatus;
    title: string;
    description: string;
  } => {
    if (summary.errorCount > 0) {
      return {
        status: 'ERRO',
        title: 'Erro',
        description: `${summary.errorCount} operação(ões) com conflito ou falha de validação.`,
      };
    }
    if (summary.pendingCount > 0) {
      return {
        status: 'PENDENTE',
        title: 'Pendente',
        description: `${summary.pendingCount} operação(ões) aguardando sincronização na fila local.`,
      };
    }
    if (!summary.isOnline || summary.serverWarmingUp || summary.draftCount > 0) {
      return {
        status: 'LOCAL_DRAFT',
        title: 'Salvo neste dispositivo',
        description: !summary.isOnline
          ? 'Modo offline ativo: exibindo cache local autorizado.'
          : summary.serverWarmingUp
          ? 'Servidor iniciando (cold start): exibindo dados locais sem bloqueio.'
          : 'Rascunho local salvo neste dispositivo.',
      };
    }
    return {
      status: 'SINCRONIZADO',
      title: 'Sincronizado',
      description: 'Todos os dados locais estão sincronizados com o servidor.',
    };
  };

  const primary = getPrimaryStateLabel();
  const failedItems = summary.items.filter((i) => i.status === 'ERRO');

  return (
    <div
      data-testid="sync-status-bar"
      className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-8 py-2.5 text-xs transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Conectividade / Estado Principal */}
          <div className="flex items-center gap-2">
            {summary.isOnline && !summary.serverWarmingUp ? (
              <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <SyncBadge status={primary.status} />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {primary.description}
            </span>
          </div>

          {/* Contadores rápidos quando há múltiplos estados */}
          {summary.draftCount > 0 && primary.status !== 'LOCAL_DRAFT' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
              <HardDrive className="w-3 h-3" />
              Salvo neste dispositivo ({summary.draftCount})
            </span>
          )}
          {summary.pendingCount > 0 && primary.status !== 'PENDENTE' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
              <Clock className="w-3 h-3" />
              Pendente ({summary.pendingCount})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {failedItems.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowDetails((prev) => !prev)}
              data-testid="sync-toggle-errors-btn"
              className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Ver conflitos ({failedItems.length})
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSyncNow}
            disabled={summary.isSyncing}
            data-testid="sync-now-btn"
            className="h-7 text-xs border-slate-200 dark:border-slate-700"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${summary.isSyncing ? 'animate-spin' : ''}`}
            />
            {summary.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Painel de resolução de conflitos / erros */}
      {(showDetails || failedItems.length > 0) && failedItems.length > 0 && (
        <div
          data-testid="sync-error-panel"
          className="mt-2.5 p-3 rounded-lg bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Operações com erro de sincronização ou conflito
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRetryErrors}
              data-testid="sync-retry-all-btn"
              className="h-7 text-xs bg-white dark:bg-slate-900 border-rose-300 text-rose-700"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
          <div className="space-y-1.5">
            {failedItems.map((item) => (
              <div
                key={item.queueId ?? item.idempotencyKey}
                className="flex items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded border border-rose-100 dark:border-rose-900"
              >
                <div className="truncate">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    [{item.entityType} - {item.operation}]
                  </span>{' '}
                  <span className="text-rose-700 dark:text-rose-400">
                    {item.lastError || 'Falha ao sincronizar'}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDiscardItem(item.queueId)}
                  data-testid="sync-discard-item-btn"
                  className="h-6 px-2 text-xs text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Descartar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
