// Configuração base da API
const API_BASE_URL = 'http://localhost:8080';

// Tipos genéricos de resposta
export interface ApiResponse<T> {
  data: T;
  status: number;
}

// Função auxiliar para fazer requisições
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

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ========== AUTENTICAÇÃO ==========
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
    
    // Salvar token no localStorage
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

// ========== PACIENTES ==========
export interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  idade: number;
  peso: number;
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

// ========== MÉDICOS ==========
export interface Medico {
  id: number;
  nome: string;
  crm: string;
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

// ========== ENFERMEIROS ==========
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

// ========== MEDICAMENTOS ==========
export interface Medicamento {
  id: number;
  nome: string;
  marca: string;
  dosePorKg: string;
  doseMaxima: string;
  intervalo: string;
  notas: string;
  volumeMl: string;
  tempoMin: string;
  fatorGotas: string;
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

// ========== CONSULTAS ==========
export interface Consulta {
  id: number;
  pacienteId: number;
  medicoId: number;
  data: string;
  descricao: string;
}

export const consultaService = {
  listar: async (): Promise<Consulta[]> => {
    return makeRequest<Consulta[]>('/consultas');
  },

  criar: async (consulta: Omit<Consulta, 'id'>): Promise<Consulta> => {
    return makeRequest<Consulta>('/consultas', {
      method: 'POST',
      body: JSON.stringify(consulta),
    });
  },

  atualizar: async (id: number, consulta: Partial<Consulta>): Promise<Consulta> => {
    return makeRequest<Consulta>(`/consultas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(consulta),
    });
  },

  deletar: async (id: number): Promise<void> => {
    return makeRequest<void>(`/consultas/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== HISTÓRICO ==========
export interface Historico {
  id: number;
  pacienteId: number;
  acao: string;
  data: string;
  usuario: string;
}

export const historicoService = {
  listar: async (): Promise<Historico[]> => {
    return makeRequest<Historico[]>('/historico');
  },

  listarPorPaciente: async (pacienteId: number): Promise<Historico[]> => {
    return makeRequest<Historico[]>(`/historico/paciente/${pacienteId}`);
  },
};
