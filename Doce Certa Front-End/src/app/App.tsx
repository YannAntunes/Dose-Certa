import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DashboardHome from './components/DashboardHome';
import Pacientes from './components/Pacientes';
import Medicos from './components/Medicos';
import Enfermeiros from './components/Enfermeiros';
import Medicamentos from './components/Medicamentos';
import Consulta from './components/Consulta';
import Historico from './components/Historico';
import Usuarios from './components/Usuarios';
import ExamAnalysisPage from './components/exames/ExamAnalysisPage';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import {
  pacienteService,
  medicoService,
  enfermeiroService,
  medicamentoService,
  historicoService,
  consultaService,
  usuarioService,
  authService,
  isNetworkOrColdStartError,
  Paciente,
  Medico,
  Enfermeiro,
  Medicamento,
  Historico as HistoricoType,
  Usuario,
  UsuarioRequest,
  PerfilUsuario,
  StatusUsuario,
} from '../services/api';
import {
  offlineDb,
  getUserScope,
  putScopedEntity,
  clearUserOfflineData,
  type SyncStatus,
} from '../services/offlineDb';
import {
  loadCachedDataForUser,
  saveServerSnapshotForUser,
  enqueueOfflineOperation,
  processSyncQueue,
  setServerWarmingUp,
  notifySyncStateChanged,
} from '../services/syncEngine';

interface User {
  username: string;
  role: string;
  id?: number;
}

function generateRequestKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

function App() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Dados da API / Cache Offline
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoType[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  /** Dados de um atendimento do histórico para pré-preencher a aba Consulta */
  const [consultaInicial, setConsultaInicial] = useState<any | null>(null);

  const userScope = getUserScope(user);

  const reloadStateFromLocalCache = useCallback(async (scope: string) => {
    if (!scope || scope === 'anonymous') return false;
    const cached = await loadCachedDataForUser(scope);
    if (cached.hasCachedData) {
      setPacientes(cached.pacientes);
      setMedicos(cached.medicos);
      setEnfermeiros(cached.enfermeiros);
      setMedicamentos(cached.medicamentos);
      setHistorico(cached.historico);
    }
    return cached.hasCachedData;
  }, []);

  const carregarUsuarios = useCallback(async () => {
    try {
      const data = await usuarioService.listar();
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }, []);

  const carregarDados = useCallback(
    async (scope: string, role: string) => {
      if (!scope || scope === 'anonymous') return;

      // 1. Stale-While-Revalidate: exibe imediatamente o cache local autorizado sem bloquear no cold start do Render
      const hadCache = await reloadStateFromLocalCache(scope);

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setServerWarmingUp(false);
        notifySyncStateChanged();
        return;
      }

      // 2. Processa fila de sincronização pendente antes de atualizar snapshot do servidor
      await processSyncQueue(scope);

      // 3. Busca dados atualizados conforme permissões do perfil
      const isClinicoOuAdmin = ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'].includes(role);
      const isRecepcaoOuAdmin = ['ADMIN', 'RECEPCAO', 'Administrador', 'Recepção'].includes(role);

      const results = await Promise.allSettled([
        pacienteService.listar(),
        isRecepcaoOuAdmin || isClinicoOuAdmin ? medicoService.listar() : Promise.resolve([]),
        isRecepcaoOuAdmin || isClinicoOuAdmin ? enfermeiroService.listar() : Promise.resolve([]),
        isClinicoOuAdmin ? medicamentoService.listar() : Promise.resolve([]),
        isClinicoOuAdmin ? historicoService.listar() : Promise.resolve([]),
      ]);

      const anyNetworkFailure = results.some(
        (r) => r.status === 'rejected' && isNetworkOrColdStartError(r.reason)
      );
      const anyFulfilled = results.some((r) => r.status === 'fulfilled');

      if (anyFulfilled) {
        setServerWarmingUp(false);
        await saveServerSnapshotForUser(scope, {
          pacientes: results[0].status === 'fulfilled' ? results[0].value : undefined,
          medicos: results[1].status === 'fulfilled' ? results[1].value : undefined,
          enfermeiros: results[2].status === 'fulfilled' ? results[2].value : undefined,
          medicamentos: results[3].status === 'fulfilled' ? results[3].value : undefined,
          historico: results[4].status === 'fulfilled' ? results[4].value : undefined,
        });
        const merged = await loadCachedDataForUser(scope);
        setPacientes(merged.pacientes);
        setMedicos(merged.medicos);
        setEnfermeiros(merged.enfermeiros);
        setMedicamentos(merged.medicamentos);
        setHistorico(merged.historico);
      } else if (anyNetworkFailure) {
        setServerWarmingUp(true);
        if (hadCache) {
          toast.info(
            'Servidor iniciando ou temporariamente indisponível. Exibindo dados salvos neste dispositivo.'
          );
        } else {
          toast.warning(
            'Servidor iniciando ou sem conexão. Suas alterações serão salvas localmente na fila de sincronização.'
          );
        }
      }
    },
    [reloadStateFromLocalCache]
  );

  // Sincronizar manualmente ou ao reconectar
  const handleSyncNow = useCallback(async () => {
    if (!user || !userScope || userScope === 'anonymous') return;
    const { syncedCount, failedCount } = await processSyncQueue(userScope, { forceNow: true });
    await carregarDados(userScope, user.role);
    if (user.role === 'ADMIN' || user.role === 'Administrador') {
      await carregarUsuarios();
    }
    if (syncedCount > 0) {
      toast.success(`${syncedCount} operação(ões) sincronizada(s) com o servidor!`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} operação(ões) apresentaram conflito ou erro de validação.`);
    }
  }, [user, userScope, carregarDados, carregarUsuarios]);

  // Carregar dados quando o usuário faz login ou recarrega a página
  useEffect(() => {
    if (user && userScope !== 'anonymous') {
      carregarDados(userScope, user.role);
      if (user.role === 'ADMIN' || user.role === 'Administrador') {
        carregarUsuarios();
      }
    }
  }, [user, userScope, carregarDados, carregarUsuarios]);

  // Listener de sessão expirada / conta desativada (401 do backend)
  useEffect(() => {
    const handleUnauthorized = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (userScope && userScope !== 'anonymous') {
        clearUserOfflineData(userScope).catch(() => {});
      }
      authService.logout();
      setUser(null);
      setCurrentPage('dashboard');
      toast.error(
        detail?.message || 'Sessão expirada ou conta inativa. Faça login novamente.'
      );
    };

    window.addEventListener('dosecerta:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dosecerta:unauthorized', handleUnauthorized);
  }, [userScope]);

  // Listener de retorno de conexão (online) e retry periódico em background
  useEffect(() => {
    if (!user || userScope === 'anonymous') return;

    const handleOnline = () => {
      toast.info('Conexão restabelecida. Sincronizando dados pendentes...');
      handleSyncNow();
    };

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        processSyncQueue(userScope).then(({ syncedCount }) => {
          if (syncedCount > 0) {
            reloadStateFromLocalCache(userScope);
          }
        });
      }
    }, 10000);

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.clearInterval(intervalId);
    };
  }, [user, userScope, handleSyncNow, reloadStateFromLocalCache]);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      const userInfo: User = {
        username: response.login,
        role: response.perfil,
        id: response.id,
      };
      setUser(userInfo);
      toast.success((t('common.status') === 'Status' ? 'Welcome, ' : 'Bem-vindo, ') + response.login + '!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(errorMessage);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  };

  const handleLogout = async () => {
    const scopeToClean = userScope;
    authService.logout();
    setUser(null);
    setPacientes([]);
    setMedicos([]);
    setEnfermeiros([]);
    setMedicamentos([]);
    setHistorico([]);
    setUsuarios([]);
    setCurrentPage('dashboard');
    await clearUserOfflineData(scopeToClean).catch(() => {});
    toast.info(t('common.status') === 'Status' ? 'You have logged out' : 'Você saiu do sistema');
  };

  // ── PACIENTES (Online + Fila Offline-First) ──
  const handleAddPaciente = async (paciente: Omit<Paciente, 'id'>) => {
    const reqKey = generateRequestKey();
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const newPaciente = await pacienteService.criar(paciente, reqKey);
        const withSync: Paciente = { ...newPaciente, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.pacientes, userScope, withSync, 'SINCRONIZADO');
        setPacientes((prev) => [...prev, withSync]);
        notifySyncStateChanged();
        toast.success('Paciente cadastrado e sincronizado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao cadastrar paciente');
          return;
        }
      }
    }

    // Fallback Offline-First: grava na fila persistente
    const tempId = -Date.now();
    const localPaciente: Paciente = {
      ...paciente,
      id: tempId,
      _syncStatus: 'PENDENTE',
    };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'PACIENTE',
      operation: 'CREATE',
      endpoint: '/pacientes',
      method: 'POST',
      localEntity: localPaciente,
      payload: { ...paciente },
    });
    setPacientes((prev) => [...prev, localPaciente]);
    toast.info('Paciente salvo neste dispositivo (Pendente de sincronização).');
  };

  const handleUpdatePaciente = async (id: number, paciente: Omit<Paciente, 'id'>) => {
    const reqKey = generateRequestKey();
    if (id > 0 && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const updated = await pacienteService.atualizar(id, paciente, reqKey);
        const withSync: Paciente = { ...updated, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.pacientes, userScope, withSync, 'SINCRONIZADO');
        setPacientes((prev) => prev.map((p) => (p.id === id ? withSync : p)));
        notifySyncStateChanged();
        toast.success('Paciente atualizado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao atualizar paciente');
          return;
        }
      }
    }

    const updatedLocal: Paciente = {
      ...paciente,
      id,
      _syncStatus: 'PENDENTE',
    };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'PACIENTE',
      operation: id < 0 ? 'CREATE' : 'UPDATE',
      endpoint: id < 0 ? '/pacientes' : `/pacientes/${id}`,
      method: id < 0 ? 'POST' : 'PUT',
      localEntity: updatedLocal,
      payload: { ...paciente },
    });
    setPacientes((prev) => prev.map((p) => (p.id === id ? updatedLocal : p)));
    toast.info('Alteração salva neste dispositivo (Pendente de sincronização).');
  };

  const handleDeletePaciente = async (id: number) => {
    try {
      if (id > 0) {
        await pacienteService.deletar(id);
      }
      await offlineDb.pacientes.delete(`${userScope}:${id}`);
      setPacientes((prev) => prev.filter((p) => p.id !== id));
      notifySyncStateChanged();
      toast.success('Paciente excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir paciente');
    }
  };

  // ── MÉDICOS (Online + Fila Offline-First) ──
  const handleAddMedico = async (medico: Omit<Medico, 'id'>) => {
    const reqKey = generateRequestKey();
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const newMedico = await medicoService.criar(medico, reqKey);
        const withSync: Medico = { ...newMedico, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.medicos, userScope, withSync, 'SINCRONIZADO');
        setMedicos((prev) => [...prev, withSync]);
        notifySyncStateChanged();
        toast.success('Médico cadastrado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao cadastrar médico');
          return;
        }
      }
    }

    const tempId = -Date.now();
    const localMedico: Medico = { ...medico, id: tempId, _syncStatus: 'PENDENTE' };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'MEDICO',
      operation: 'CREATE',
      endpoint: '/medicos',
      method: 'POST',
      localEntity: localMedico,
      payload: { ...medico },
    });
    setMedicos((prev) => [...prev, localMedico]);
    toast.info('Médico salvo neste dispositivo (Pendente de sincronização).');
  };

  const handleUpdateMedico = async (id: number, medico: Omit<Medico, 'id'>) => {
    const reqKey = generateRequestKey();
    if (id > 0 && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const updated = await medicoService.atualizar(id, medico, reqKey);
        const withSync: Medico = { ...updated, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.medicos, userScope, withSync, 'SINCRONIZADO');
        setMedicos((prev) => prev.map((m) => (m.id === id ? withSync : m)));
        notifySyncStateChanged();
        toast.success('Médico atualizado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao atualizar médico');
          return;
        }
      }
    }

    const updatedLocal: Medico = { ...medico, id, _syncStatus: 'PENDENTE' };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'MEDICO',
      operation: id < 0 ? 'CREATE' : 'UPDATE',
      endpoint: id < 0 ? '/medicos' : `/medicos/${id}`,
      method: id < 0 ? 'POST' : 'PUT',
      localEntity: updatedLocal,
      payload: { ...medico },
    });
    setMedicos((prev) => prev.map((m) => (m.id === id ? updatedLocal : m)));
    toast.info('Médico atualizado localmente (Pendente de sincronização).');
  };

  const handleDeleteMedico = async (id: number) => {
    try {
      if (id > 0) {
        await medicoService.deletar(id);
      }
      await offlineDb.medicos.delete(`${userScope}:${id}`);
      setMedicos((prev) => prev.filter((m) => m.id !== id));
      notifySyncStateChanged();
      toast.success('Médico excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir médico');
    }
  };

  // ── ENFERMEIROS (Online + Fila Offline-First) ──
  const handleAddEnfermeiro = async (enfermeiro: Omit<Enfermeiro, 'id'>) => {
    const reqKey = generateRequestKey();
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const newEnfermeiro = await enfermeiroService.criar(enfermeiro, reqKey);
        const withSync: Enfermeiro = { ...newEnfermeiro, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.enfermeiros, userScope, withSync, 'SINCRONIZADO');
        setEnfermeiros((prev) => [...prev, withSync]);
        notifySyncStateChanged();
        toast.success('Enfermeiro cadastrado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao cadastrar enfermeiro');
          return;
        }
      }
    }

    const tempId = -Date.now();
    const localEnfermeiro: Enfermeiro = { ...enfermeiro, id: tempId, _syncStatus: 'PENDENTE' };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'ENFERMEIRO',
      operation: 'CREATE',
      endpoint: '/enfermeiros',
      method: 'POST',
      localEntity: localEnfermeiro,
      payload: { ...enfermeiro },
    });
    setEnfermeiros((prev) => [...prev, localEnfermeiro]);
    toast.info('Enfermeiro salvo neste dispositivo (Pendente de sincronização).');
  };

  const handleUpdateEnfermeiro = async (id: number, enfermeiro: Omit<Enfermeiro, 'id'>) => {
    const reqKey = generateRequestKey();
    if (id > 0 && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const updated = await enfermeiroService.atualizar(id, enfermeiro, reqKey);
        const withSync: Enfermeiro = { ...updated, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.enfermeiros, userScope, withSync, 'SINCRONIZADO');
        setEnfermeiros((prev) => prev.map((e) => (e.id === id ? withSync : e)));
        notifySyncStateChanged();
        toast.success('Enfermeiro atualizado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao atualizar enfermeiro');
          return;
        }
      }
    }

    const updatedLocal: Enfermeiro = { ...enfermeiro, id, _syncStatus: 'PENDENTE' };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'ENFERMEIRO',
      operation: id < 0 ? 'CREATE' : 'UPDATE',
      endpoint: id < 0 ? '/enfermeiros' : `/enfermeiros/${id}`,
      method: id < 0 ? 'POST' : 'PUT',
      localEntity: updatedLocal,
      payload: { ...enfermeiro },
    });
    setEnfermeiros((prev) => prev.map((e) => (e.id === id ? updatedLocal : e)));
    toast.info('Enfermeiro atualizado localmente (Pendente de sincronização).');
  };

  const handleDeleteEnfermeiro = async (id: number) => {
    try {
      if (id > 0) {
        await enfermeiroService.deletar(id);
      }
      await offlineDb.enfermeiros.delete(`${userScope}:${id}`);
      setEnfermeiros((prev) => prev.filter((e) => e.id !== id));
      notifySyncStateChanged();
      toast.success('Enfermeiro excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir enfermeiro');
    }
  };

  // ── MEDICAMENTOS (Online + Fila Offline-First) ──
  const handleAddMedicamento = async (medicamento: Omit<Medicamento, 'id'>) => {
    const reqKey = generateRequestKey();
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const newMedicamento = await medicamentoService.criar(medicamento, reqKey);
        const withSync: Medicamento = { ...newMedicamento, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.medicamentos, userScope, withSync, 'SINCRONIZADO');
        setMedicamentos((prev) => [...prev, withSync]);
        notifySyncStateChanged();
        toast.success('Medicamento cadastrado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao cadastrar medicamento');
          return;
        }
      }
    }

    const tempId = -Date.now();
    const localMed: Medicamento = { ...medicamento, id: tempId, _syncStatus: 'PENDENTE' };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'MEDICAMENTO',
      operation: 'CREATE',
      endpoint: '/medicamentos',
      method: 'POST',
      localEntity: localMed,
      payload: { ...medicamento },
    });
    setMedicamentos((prev) => [...prev, localMed]);
    toast.info('Medicamento salvo neste dispositivo (Pendente de sincronização).');
  };

  const handleUpdateMedicamento = async (id: number, medicamento: Omit<Medicamento, 'id'>) => {
    const reqKey = generateRequestKey();
    if (id > 0 && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const updated = await medicamentoService.atualizar(id, medicamento, reqKey);
        const withSync: Medicamento = { ...updated, _syncStatus: 'SINCRONIZADO' };
        await putScopedEntity(offlineDb.medicamentos, userScope, withSync, 'SINCRONIZADO');
        setMedicamentos((prev) => prev.map((m) => (m.id === id ? withSync : m)));
        notifySyncStateChanged();
        toast.success('Medicamento atualizado com sucesso!');
        return;
      } catch (error: any) {
        if (!isNetworkOrColdStartError(error)) {
          toast.error(error?.message || 'Erro ao atualizar medicamento');
          return;
        }
      }
    }

    const updatedLocal: Medicamento = { ...medicamento, id, _syncStatus: 'PENDENTE' };
    await enqueueOfflineOperation({
      userScope,
      entityType: 'MEDICAMENTO',
      operation: id < 0 ? 'CREATE' : 'UPDATE',
      endpoint: id < 0 ? '/medicamentos' : `/medicamentos/${id}`,
      method: id < 0 ? 'POST' : 'PUT',
      localEntity: updatedLocal,
      payload: { ...medicamento },
    });
    setMedicamentos((prev) => prev.map((m) => (m.id === id ? updatedLocal : m)));
    toast.info('Medicamento atualizado localmente (Pendente de sincronização).');
  };

  const handleDeleteMedicamento = async (id: number) => {
    try {
      if (id > 0) {
        await medicamentoService.deletar(id);
      }
      await offlineDb.medicamentos.delete(`${userScope}:${id}`);
      setMedicamentos((prev) => prev.filter((m) => m.id !== id));
      notifySyncStateChanged();
      toast.success('Medicamento excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir medicamento');
    }
  };

  // ── CONSULTA CLÍNICA (Validação Servidor Obrigatória para Confirmação Final) ──
  const handleSaveConsulta = async (consulta: any): Promise<{ syncStatus: SyncStatus }> => {
    const tipoMap: Record<string, 'DOSE_MGKG' | 'VOLUME_MLH' | 'GOTAS_MIN'> = {
      dose: 'DOSE_MGKG',
      volume: 'VOLUME_MLH',
      gotas: 'GOTAS_MIN',
    };
    const payload = {
      pacienteId: consulta.pacienteId,
      medicamentoId: consulta.medicamentoId,
      medicoId: consulta.tipoProfissional === 'medico' ? consulta.profissionalId : undefined,
      enfermeiroId: consulta.tipoProfissional === 'enfermeiro' ? consulta.profissionalId : undefined,
      tipoCalculo: tipoMap[consulta.tipoCalculo] ?? 'DOSE_MGKG',
      observacoes: consulta.observacoes,
    };

    const reqKey = generateRequestKey();

    if (
      consulta.pacienteId > 0 &&
      consulta.medicamentoId > 0 &&
      consulta.profissionalId > 0 &&
      typeof navigator !== 'undefined' &&
      navigator.onLine !== false
    ) {
      try {
        await consultaService.salvar(payload, reqKey);
        const novoHistorico = await historicoService.listar();
        await saveServerSnapshotForUser(userScope, { historico: novoHistorico });
        const merged = await loadCachedDataForUser(userScope);
        setHistorico(merged.historico);
        return { syncStatus: 'SINCRONIZADO' };
      } catch (error) {
        if (!isNetworkOrColdStartError(error)) {
          throw error;
        }
      }
    }

    // Modo Offline / Cold Start: enfileira consulta como PENDENTE (não confirmada pelo servidor ainda)
    const tempId = -Date.now();
    const localHistoricoItem: HistoricoType = {
      id: tempId,
      data: new Date().toISOString(),
      pacienteId: consulta.pacienteId,
      paciente: consulta.pacienteNome || 'Paciente (Local)',
      medicamentoId: consulta.medicamentoId,
      medicamento: consulta.medicamentoNome || 'Medicamento',
      profissional: consulta.profissionalNome || 'Profissional',
      tipoProfissional: consulta.tipoProfissional,
      resultado: consulta.resultadoFormatado || 'Pendente de validação',
      observacoes: consulta.observacoes,
      _syncStatus: 'PENDENTE',
    };

    await enqueueOfflineOperation({
      userScope,
      entityType: 'CONSULTA',
      operation: 'CREATE',
      endpoint: '/consultas',
      method: 'POST',
      localEntity: localHistoricoItem,
      payload,
      initialSyncStatus: 'PENDENTE',
    });

    setHistorico((prev) => [localHistoricoItem, ...prev]);
    return { syncStatus: 'PENDENTE' };
  };

  // ── GESTÃO DE USUÁRIOS E APROVAÇÃO (ADMIN) ──
  const handleAddUsuario = async (u: UsuarioRequest) => {
    try {
      const created = await usuarioService.criar(u);
      setUsuarios((prev) => [...prev, created]);
      toast.success(`Usuário "${created.login}" criado com sucesso!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar usuário.');
      throw err;
    }
  };

  const handleUpdateUsuario = async (id: number, u: UsuarioRequest) => {
    try {
      const updated = await usuarioService.atualizar(id, u);
      setUsuarios((prev) => prev.map((usr) => (usr.id === id ? updated : usr)));
      toast.success(`Usuário "${updated.login}" atualizado com sucesso!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar usuário.');
      throw err;
    }
  };

  const handleDeleteUsuario = async (id: number) => {
    try {
      await usuarioService.deletar(id);
      setUsuarios((prev) => prev.filter((usr) => usr.id !== id));
      toast.success('Usuário excluído com sucesso!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir usuário.');
      throw err;
    }
  };

  const handleApproveUsuario = async (id: number, perfil: PerfilUsuario) => {
    try {
      const updated = await usuarioService.aprovar(id, perfil);
      setUsuarios((prev) => prev.map((usr) => (usr.id === id ? updated : usr)));
      toast.success(`Cadastro de "${updated.login}" aprovado com perfil ${updated.perfil}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao aprovar usuário.');
      throw err;
    }
  };

  const handleRejectUsuario = async (id: number) => {
    try {
      const updated = await usuarioService.rejeitar(id);
      setUsuarios((prev) => prev.map((usr) => (usr.id === id ? updated : usr)));
      toast.info(`Solicitação de "${updated.login}" rejeitada.`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao rejeitar usuário.');
      throw err;
    }
  };

  const handleChangeStatusUsuario = async (id: number, status: StatusUsuario) => {
    try {
      const updated = await usuarioService.alterarStatus(id, status);
      setUsuarios((prev) => prev.map((usr) => (usr.id === id ? updated : usr)));
      toast.success(`Status de "${updated.login}" alterado para ${updated.status}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar status do usuário.');
      throw err;
    }
  };

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardHome
            stats={{
              pacientes: pacientes.length,
              medicos: medicos.length,
              enfermeiros: enfermeiros.length,
              medicamentos: medicamentos.length,
              consultas: historico.length,
            }}
            historico={historico}
          />
        );
      case 'pacientes':
        return (
          <Pacientes
            pacientes={pacientes}
            onAddPaciente={handleAddPaciente}
            onUpdatePaciente={handleUpdatePaciente}
            onDeletePaciente={handleDeletePaciente}
          />
        );
      case 'medicos':
        return (
          <Medicos
            medicos={medicos}
            onAddMedico={handleAddMedico}
            onUpdateMedico={handleUpdateMedico}
            onDeleteMedico={handleDeleteMedico}
          />
        );
      case 'enfermeiros':
        return (
          <Enfermeiros
            enfermeiros={enfermeiros}
            onAddEnfermeiro={handleAddEnfermeiro}
            onUpdateEnfermeiro={handleUpdateEnfermeiro}
            onDeleteEnfermeiro={handleDeleteEnfermeiro}
          />
        );
      case 'medicamentos':
        return (
          <Medicamentos
            medicamentos={medicamentos}
            onAddMedicamento={handleAddMedicamento}
            onUpdateMedicamento={handleUpdateMedicamento}
            onDeleteMedicamento={handleDeleteMedicamento}
          />
        );
      case 'consulta':
        return (
          <Consulta
            pacientes={pacientes}
            medicos={medicos}
            enfermeiros={enfermeiros}
            medicamentos={medicamentos}
            onSaveConsulta={handleSaveConsulta}
            userScope={userScope}
            initialData={consultaInicial}
          />
        );
      case 'historico':
        return (
          <Historico
            historico={historico}
            pacientes={pacientes}
            onReabrirConsulta={(item) => {
              setConsultaInicial(item);
              setCurrentPage('consulta');
            }}
            onNovoAtendimento={(paciente) => {
              setConsultaInicial({ pacienteId: paciente.id, paciente: paciente.nome } as any);
              setCurrentPage('consulta');
            }}
            onRefresh={handleSyncNow}
          />
        );
      case 'exames':
        return <ExamAnalysisPage pacientes={pacientes} />;
      case 'usuarios':
        return (
          <Usuarios
            usuarios={usuarios}
            onAdd={handleAddUsuario}
            onUpdate={handleUpdateUsuario}
            onDelete={handleDeleteUsuario}
            onApprove={handleApproveUsuario}
            onReject={handleRejectUsuario}
            onChangeStatus={handleChangeStatusUsuario}
            currentUserId={user.id}
          />
        );
      default:
        return (
          <DashboardHome
            stats={{
              pacientes: pacientes.length,
              medicos: medicos.length,
              enfermeiros: enfermeiros.length,
              medicamentos: medicamentos.length,
              consultas: historico.length,
            }}
            historico={historico}
          />
        );
    }
  };

  return (
    <>
      <Dashboard
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
        userScope={userScope}
        onSyncNow={handleSyncNow}
      >
        {renderPage()}
      </Dashboard>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
