// Configuração base da API
import { resolveApiBaseUrl } from './apiConfig.js';
const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV);

// ──────────────────────────────────────────────────────────────────────────────
// Função auxiliar para fazer requisições
// ──────────────────────────────────────────────────────────────────────────────
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Adicionar token JWT se existir
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
      signal: options.signal ?? AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Não foi possível conectar à API (' + API_BASE_URL + '). Verifique o backend e VITE_API_BASE_URL.');
  }

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/login') {
      localStorage.removeItem('token');
      window.location.reload();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    // FIX M-01: tenta parsear campo 'message' do ErrorResponseDTO do backend
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.mensagem || (response.status === 401 ? 'Credenciais inválidas.' : `Erro ${response.status}`));
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
    }
    
    return response;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getToken: () => localStorage.getItem('token'),
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
}

export const pacienteService = {
  listar: async (): Promise<Paciente[]> => {
    return makeRequest<Paciente[]>('/pacientes');
  },

  criar: async (paciente: Omit<Paciente, 'id'>): Promise<Paciente> => {
    return makeRequest<Paciente>('/pacientes', {
      method: 'POST',
      body: JSON.stringify(paciente),
    });
  },

  atualizar: async (id: number, paciente: Partial<Paciente>): Promise<Paciente> => {
    return makeRequest<Paciente>(`/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paciente),
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
}

export const medicoService = {
  listar: async (): Promise<Medico[]> => {
    return makeRequest<Medico[]>('/medicos');
  },

  criar: async (medico: Omit<Medico, 'id'>): Promise<Medico> => {
    return makeRequest<Medico>('/medicos', {
      method: 'POST',
      body: JSON.stringify(medico),
    });
  },

  atualizar: async (id: number, medico: Partial<Medico>): Promise<Medico> => {
    return makeRequest<Medico>(`/medicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medico),
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
}

export const enfermeiroService = {
  listar: async (): Promise<Enfermeiro[]> => {
    return makeRequest<Enfermeiro[]>('/enfermeiros');
  },

  criar: async (enfermeiro: Omit<Enfermeiro, 'id'>): Promise<Enfermeiro> => {
    return makeRequest<Enfermeiro>('/enfermeiros', {
      method: 'POST',
      body: JSON.stringify(enfermeiro),
    });
  },

  atualizar: async (id: number, enfermeiro: Partial<Enfermeiro>): Promise<Enfermeiro> => {
    return makeRequest<Enfermeiro>(`/enfermeiros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enfermeiro),
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
// FIX C-01 / M-01: Tipos e nomes dos campos alinhados 100% com o backend Java.
//   - Campos numéricos agora são number (não string)
//   - Nomes agora correspondem ao MedicamentoResponseDTO:
//     dosePorKg, doseMaxima, doseDisponivel, volumeDisponivel, fatorGotejamento, tempoMinutos
// ══════════════════════════════════════════════════════════════════════════════
export interface Medicamento {
  id: number;
  nome: string;
  brand: string;          // equivale a "marca" — campo do backend é "brand"
  dosePorKg: number;      // FIX: era string, era acessado como "dosePorKg" ✓
  doseMaxima: number;     // FIX: era string
  doseDisponivel: number; // FIX: era "volumeMl" (nome errado)
  volumeDisponivel: number; // FIX: era "volumeMl" (nome errado)
  fatorGotejamento: number; // FIX: era "fatorGotas" e string
  tempoMinutos: number;   // FIX: era "tempoMin" e string
  intervalo: string;
  notas: string;
  tipoPadrao?: string;
}

export const medicamentoService = {
  listar: async (): Promise<Medicamento[]> => {
    return makeRequest<Medicamento[]>('/medicamentos');
  },

  criar: async (medicamento: Omit<Medicamento, 'id'>): Promise<Medicamento> => {
    return makeRequest<Medicamento>('/medicamentos', {
      method: 'POST',
      body: JSON.stringify(medicamento),
    });
  },

  atualizar: async (id: number, medicamento: Partial<Medicamento>): Promise<Medicamento> => {
    return makeRequest<Medicamento>(`/medicamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicamento),
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
  salvar: async (req: ConsultaRequest): Promise<void> => {
    await makeRequest<void>('/consultas', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HISTÓRICO
// FIX B-04: Adicionados pacienteId e medicamentoId ao tipo Historico.
// ══════════════════════════════════════════════════════════════════════════════
export interface Historico {
  id: number;
  data: string;            // ISO string vindo de dataHora
  pacienteId?: number;     // FIX B-04: permite reabrir por ID
  paciente: string;
  medicamentoId?: number;  // FIX B-04: permite reabrir por ID
  profissional: string;
  tipoProfissional: string;
  medicamento: string;
  resultado: string;       // "valor unidade"
  observacoes?: string;
}

export const historicoService = {
  listar: async (): Promise<Historico[]> => {
    const raw: any[] = await makeRequest<any[]>('/historico');
    return raw.map(c => ({
      id: c.id,
      data: c.dataHora,
      pacienteId: c.pacienteId,   // FIX B-04
      paciente: c.paciente,
      medicamentoId: c.medicamentoId, // FIX B-04
      profissional: c.profissional,
      tipoProfissional: c.tipoProfissional,
      medicamento: c.medicamento,
      resultado: `${Number(c.resultado).toFixed(2)} ${c.unidade}`,
      observacoes: c.observacoes,
    }));
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// USUÁRIOS
// ══════════════════════════════════════════════════════════════════════════════
export type PerfilUsuario = 'ADMIN' | 'MEDICO' | 'ENFERMEIRO' | 'RECEPCAO';

export interface Usuario {
  id: number;
  login: string;
  perfil: PerfilUsuario;
}

export interface UsuarioRequest {
  login: string;
  senha?: string;
  perfil: PerfilUsuario;
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
};
