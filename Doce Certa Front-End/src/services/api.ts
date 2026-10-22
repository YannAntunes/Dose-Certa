// Configuração base da API
import { resolveApiBaseUrl } from './apiConfig.js';
const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV);

const SESSION_USER_KEY = 'dosecerta_user';

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

export class ApiHttpError extends Error {
  status: number;
  code?: string;
  isNetworkError: boolean;

  constructor(message: string, status: number, code?: string, isNetworkError = false) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.code = code;
    this.isNetworkError = isNetworkError;
  }
}

export function isNetworkOrColdStartError(err: unknown): boolean {
  if (err instanceof ApiHttpError) {
    return err.isNetworkError || err.status === 502 || err.status === 503 || err.status === 504;
  }
  if (err instanceof Error) {
    return (
      err.message.includes('Não foi possível conectar à API') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError')
    );
  }
  return false;
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  timeoutMs?: number;
  suppressReloadOn401?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Função auxiliar para fazer requisições
// ──────────────────────────────────────────────────────────────────────────────
export async function makeRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Adicionar token JWT se existir
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (options.idempotencyKey) {
    defaultHeaders['X-Idempotency-Key'] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers as Record<string, string> || {}) },
      signal: options.signal ?? AbortSignal.timeout(options.timeoutMs ?? 15000),
    });
  } catch {
    throw new ApiHttpError(
      'Não foi possível conectar à API (' + API_BASE_URL + '). Verifique o backend e VITE_API_BASE_URL.',
      0,
      'NETWORK_ERROR',
      true
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401 && endpoint !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem(SESSION_USER_KEY);
      window.dispatchEvent(
        new CustomEvent('dosecerta:unauthorized', {
          detail: {
            message:
              error.message ||
              error.mensagem ||
              'Sua sessão expirou ou sua conta foi desativada. Faça login novamente.',
          },
        })
      );
      throw new ApiHttpError(
        error.message || error.mensagem || 'Sessão expirada. Faça login novamente.',
        401,
        error.error || 'NAO_AUTORIZADO',
        false
      );
    }
    throw new ApiHttpError(
      error.message ||
        error.mensagem ||
        (response.status === 401 ? 'Credenciais inválidas.' : `Erro ${response.status}`),
      response.status,
      error.error,
      response.status === 502 || response.status === 503 || response.status === 504
    );
  }

  // Se o status for 204 No Content, não tente parsear JSON (como no DELETE)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function checkApiConnection(): Promise<{ status: string; database: string }> {
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + '/health/ready', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error('Não foi possível conectar à API (' + API_BASE_URL + ').');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== 'UP' || body.database !== 'UP') {
    throw new Error('A API ou a conexão com o banco de dados está indisponível.');
  }
  return body;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTENTICAÇÃO
// ══════════════════════════════════════════════════════════════════════════════
export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  id: number;
  login: string;
  perfil: string;
}

export const authService = {
  login: async (login: string, senha: string): Promise<LoginResponse> => {
    const response = await makeRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ login, senha }),
    });

    if (response.token) {
      localStorage.setItem('token', response.token);
      const sessionUser: SessionUser = {
        id: response.id,
        username: response.login,
        role: response.perfil,
      };
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
    }

    return response;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_USER_KEY);
  },

  getToken: () => localStorage.getItem('token'),

  getStoredUser: (): SessionUser | null => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!token || !raw) return null;
    try {
      const parsed = JSON.parse(raw) as SessionUser;
      if (!parsed || !parsed.username || !parsed.role) return null;
      return parsed;
    } catch {
      return null;
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// PACIENTES
// ══════════════════════════════════════════════════════════════════════════════
export interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  idade: number;
  peso: number;
  tipoDocumento?: string;
  paisOrigem?: string;
  _syncStatus?: 'LOCAL_DRAFT' | 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  _syncError?: string;
}

export const pacienteService = {
  listar: async (): Promise<Paciente[]> => {
    return makeRequest<Paciente[]>('/pacientes');
  },

  criar: async (paciente: Omit<Paciente, 'id'>, idempotencyKey?: string): Promise<Paciente> => {
    return makeRequest<Paciente>('/pacientes', {
      method: 'POST',
      body: JSON.stringify(paciente),
      idempotencyKey,
    });
  },

  atualizar: async (
    id: number,
    paciente: Partial<Paciente>,
    idempotencyKey?: string
  ): Promise<Paciente> => {
    return makeRequest<Paciente>(`/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paciente),
      idempotencyKey,
    });
  },

  deletar: async (id: number): Promise<void> => {
    return makeRequest<void>(`/pacientes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MÉDICOS
// ══════════════════════════════════════════════════════════════════════════════
export interface Medico {
  id: number;
  nome: string;
  crm: number;
  estado: string;
  _syncStatus?: 'LOCAL_DRAFT' | 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  _syncError?: string;
}

export const medicoService = {
  listar: async (): Promise<Medico[]> => {
    return makeRequest<Medico[]>('/medicos');
  },

  criar: async (medico: Omit<Medico, 'id'>, idempotencyKey?: string): Promise<Medico> => {
    return makeRequest<Medico>('/medicos', {
      method: 'POST',
      body: JSON.stringify(medico),
      idempotencyKey,
    });
  },

  atualizar: async (
    id: number,
    medico: Partial<Medico>,
    idempotencyKey?: string
  ): Promise<Medico> => {
    return makeRequest<Medico>(`/medicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medico),
      idempotencyKey,
    });
  },

  deletar: async (id: number): Promise<void> => {
    return makeRequest<void>(`/medicos/${id}`, {
      method: 'DELETE',
    });
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ENFERMEIROS
// ══════════════════════════════════════════════════════════════════════════════
export interface Enfermeiro {
  id: number;
  nome: string;
  coren: string;
  estado: string;
  _syncStatus?: 'LOCAL_DRAFT' | 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  _syncError?: string;
}

export const enfermeiroService = {
  listar: async (): Promise<Enfermeiro[]> => {
    return makeRequest<Enfermeiro[]>('/enfermeiros');
  },

  criar: async (
    enfermeiro: Omit<Enfermeiro, 'id'>,
    idempotencyKey?: string
  ): Promise<Enfermeiro> => {
    return makeRequest<Enfermeiro>('/enfermeiros', {
      method: 'POST',
      body: JSON.stringify(enfermeiro),
      idempotencyKey,
    });
  },

  atualizar: async (
    id: number,
    enfermeiro: Partial<Enfermeiro>,
    idempotencyKey?: string
  ): Promise<Enfermeiro> => {
    return makeRequest<Enfermeiro>(`/enfermeiros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enfermeiro),
      idempotencyKey,
    });
  },

  deletar: async (id: number): Promise<void> => {
    return makeRequest<void>(`/enfermeiros/${id}`, {
      method: 'DELETE',
    });
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MEDICAMENTOS
// ══════════════════════════════════════════════════════════════════════════════
export interface Medicamento {
  id: number;
  nome: string;
  brand: string;          // equivale a "marca" — campo do backend é "brand"
  dosePorKg: number;
  doseMaxima: number;
  doseDisponivel: number;
  volumeDisponivel: number;
  fatorGotejamento: number;
  tempoMinutos: number;
  intervalo: string;
  notas: string;
  tipoPadrao?: string;
  _syncStatus?: 'LOCAL_DRAFT' | 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  _syncError?: string;
}

export const medicamentoService = {
  listar: async (): Promise<Medicamento[]> => {
    return makeRequest<Medicamento[]>('/medicamentos');
  },

  criar: async (
    medicamento: Omit<Medicamento, 'id'>,
    idempotencyKey?: string
  ): Promise<Medicamento> => {
    return makeRequest<Medicamento>('/medicamentos', {
      method: 'POST',
      body: JSON.stringify(medicamento),
      idempotencyKey,
    });
  },

  atualizar: async (
    id: number,
    medicamento: Partial<Medicamento>,
    idempotencyKey?: string
  ): Promise<Medicamento> => {
    return makeRequest<Medicamento>(`/medicamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicamento),
      idempotencyKey,
    });
  },

  deletar: async (id: number): Promise<void> => {
    return makeRequest<void>(`/medicamentos/${id}`, {
      method: 'DELETE',
    });
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// CONSULTAS (salvar no banco)
// ══════════════════════════════════════════════════════════════════════════════
export interface ConsultaRequest {
  pacienteId: number;
  medicamentoId: number;
  medicoId?: number;
  enfermeiroId?: number;
  tipoCalculo: 'DOSE_MGKG' | 'VOLUME_MLH' | 'GOTAS_MIN';
  observacoes?: string;
}

export const consultaService = {
  salvar: async (req: ConsultaRequest, idempotencyKey?: string): Promise<any> => {
    return makeRequest<any>('/consultas', {
      method: 'POST',
      body: JSON.stringify(req),
      idempotencyKey,
    });
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HISTÓRICO
// ══════════════════════════════════════════════════════════════════════════════
export interface Historico {
  id: number;
  data: string;            // ISO string vindo de dataHora
  pacienteId?: number;
  paciente: string;
  medicamentoId?: number;
  profissional: string;
  tipoProfissional: string;
  medicamento: string;
  resultado: string;       // "valor unidade"
  observacoes?: string;
  _syncStatus?: 'LOCAL_DRAFT' | 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  _syncError?: string;
}

export const historicoService = {
  listar: async (): Promise<Historico[]> => {
    const raw: any[] = await makeRequest<any[]>('/historico');
    return raw.map(c => ({
      id: c.id,
      data: c.dataHora,
      pacienteId: c.pacienteId,
      paciente: c.paciente,
      medicamentoId: c.medicamentoId,
      profissional: c.profissional,
      tipoProfissional: c.tipoProfissional,
      medicamento: c.medicamento,
      resultado: `${Number(c.resultado).toFixed(2)} ${c.unidade}`,
      observacoes: c.observacoes,
      _syncStatus: 'SINCRONIZADO',
    }));
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// USUÁRIOS E CADASTRO PÚBLICO
// ══════════════════════════════════════════════════════════════════════════════
export type PerfilUsuario = 'ADMIN' | 'MEDICO' | 'ENFERMEIRO' | 'RECEPCAO';
export type StatusUsuario = 'PENDENTE' | 'ATIVO' | 'REJEITADO' | 'INATIVO';

export interface Usuario {
  id: number;
  login: string;
  perfil: PerfilUsuario;
  status?: StatusUsuario;
  perfilSolicitado?: PerfilUsuario;
  criadoEm?: string;
}

export interface UsuarioRequest {
  login: string;
  senha?: string;
  perfil: PerfilUsuario;
  status?: StatusUsuario;
}

export interface RegistroPublicoRequest {
  login: string;
  senha: string;
  perfilSolicitado: 'MEDICO' | 'ENFERMEIRO' | 'RECEPCAO';
}

export const usuarioService = {
  listar: async (): Promise<Usuario[]> => {
    return makeRequest<Usuario[]>('/usuarios');
  },

  criar: async (usuario: UsuarioRequest): Promise<Usuario> => {
    return makeRequest<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(usuario),
    });
  },

  atualizar: async (id: number, usuario: UsuarioRequest): Promise<Usuario> => {
    return makeRequest<Usuario>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(usuario),
    });
  },

  deletar: async (id: number): Promise<void> => {
    return makeRequest<void>(`/usuarios/${id}`, {
      method: 'DELETE',
    });
  },

  solicitarCadastroPublico: async (req: RegistroPublicoRequest): Promise<Usuario> => {
    return makeRequest<Usuario>('/usuarios/cadastro-publico', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  aprovar: async (id: number, perfil: PerfilUsuario): Promise<Usuario> => {
    return makeRequest<Usuario>(`/usuarios/${id}/aprovar`, {
      method: 'PUT',
      body: JSON.stringify({ perfil }),
    });
  },

  rejeitar: async (id: number): Promise<Usuario> => {
    return makeRequest<Usuario>(`/usuarios/${id}/rejeitar`, {
      method: 'PUT',
    });
  },

  alterarStatus: async (id: number, status: StatusUsuario): Promise<Usuario> => {
    return makeRequest<Usuario>(`/usuarios/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
