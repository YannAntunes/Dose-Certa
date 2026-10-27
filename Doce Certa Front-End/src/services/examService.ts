/**
 * Serviço de integração com o Módulo de Análise Inteligente de Exames
 * Dose Certa - Apoio à Decisão Clínica
 */

const API_BASE_URL = 'http://localhost:8080';

export type ExamStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ANALYZED' | 'ERROR';

export type ResultStatus =
  | 'WITHIN_REFERENCE'
  | 'BELOW_REFERENCE'
  | 'ABOVE_REFERENCE'
  | 'NEEDS_CONTEXT'
  | 'NO_REFERENCE'
  | 'CRITICAL_LOW'
  | 'CRITICAL_HIGH';

export type AppliedReference = 'LABORATORY' | 'INSTITUTIONAL' | 'CLINICAL_TARGET' | 'NONE';

export type FindingSeverity = 'INFO' | 'ATTENTION' | 'URGENT' | 'CRITICAL';

export type FindingType =
  | 'WITHIN_REFERENCE'
  | 'ABOVE_REFERENCE'
  | 'BELOW_REFERENCE'
  | 'TREND'
  | 'INSUFFICIENT_CONTEXT'
  | 'DISCREPANCY';

export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'INSUFFICIENT_CONTEXT' | 'ERROR';

export interface ExamSummary {
  id: number;
  patientId: number;
  laboratory: string | null;
  collectionDate: string | null;
  releaseDate: string | null;
  originalFilename: string;
  status: ExamStatus;
  errorMessage: string | null;
  processingNotes: string | null;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResultDto {
  id: number;
  testCode: string;
  originalName: string;
  normalizedName: string;
  numericValue: number | null;
  textValue: string | null;
  originalUnit: string | null;
  normalizedUnit: string | null;
  referenceText: string | null;
  refLower: number | null;
  refLowerOp: 'GT' | 'GE' | null;
  refUpper: number | null;
  refUpperOp: 'LT' | 'LE' | null;
  status: ResultStatus;
  statusJustification: string | null;
  appliedReference: AppliedReference;
  contextReasonCode?: string | null;
  sourcePage: number | null;
  confidence: number;
  needsReview: boolean;
  qualitative: boolean;
  historical: boolean;
  resultDate: string | null;
  notes: string | null;
}

export interface FindingDto {
  id: number;
  resultId: number | null;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  sourceKeys: string[];
}

export interface SourceDto {
  sourceKey: string;
  title: string;
  organization: string;
  sourceType: string;
  versionId: string;
  url: string | null;
  excerpt: string | null;
  locator: string | null;
  accessedAt: string;
}

export interface AnalysisDto {
  id: number;
  examId: number;
  status: AnalysisStatus;
  summary: string;
  clinicalContext?: string | null;
  warnings: string[];
  modelId: string;
  contractVersion: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  findings: FindingDto[];
  sources: SourceDto[];
  disclaimer: string;
}

export interface AnalyteEvolutionPoint {
  examId: number;
  resultId: number;
  collectionDate: string;
  numericValue: number | null;
  textValue: string | null;
  unit: string;
  status: ResultStatus;
  laboratory: string | null;
}

export interface AnalyteEvolutionSeries {
  testCode: string;
  canonicalName: string;
  unit: string;
  refLower: number | null;
  refUpper: number | null;
  refSource: string | null;
  points: AnalyteEvolutionPoint[];
  sufficient: boolean;
}

export interface ExamDetail {
  exam: ExamSummary;
  results: ResultDto[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  empty: boolean;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    const err = await res.json().catch(() => ({}));
    const message =
      err.message ||
      err.mensagem ||
      err.error ||
      `Erro ${res.status}: ${res.statusText || 'Falha na requisição'}`;
    throw new Error(message);
  }
  return res.json();
}

export const examService = {
  /**
   * Envia um arquivo PDF de exame associado a um paciente
   */
  upload: async (patientId: number, file: File, sex?: 'M' | 'F'): Promise<ExamSummary> => {
    const formData = new FormData();
    formData.append('patientId', String(patientId));
    formData.append('file', file);
    if (sex) {
      formData.append('sex', sex);
    }

    // Nota: NÃO definir 'Content-Type', o navegador define multipart/form-data com boundary automaticamente
    const headers = getAuthHeaders();

    const res = await fetch(`${API_BASE_URL}/api/v1/exams`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse<ExamSummary>(res);
  },

  /**
   * Consulta os detalhes e resultados de um exame por ID
   */
  getById: async (id: number): Promise<ExamDetail> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/exams/${id}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<ExamDetail>(res);
  },

  /**
   * Lista os resultados identificados no exame
   */
  getResults: async (id: number): Promise<ResultDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/exams/${id}/results`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<ResultDto[]>(res);
  },

  /**
   * Lista histórico paginado de exames de um paciente
   */
  listByPatient: async (patientId: number, page = 0, size = 20): Promise<PageResponse<ExamSummary>> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/exams?page=${page}&size=${size}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponse<ExamSummary>>(res);
  },

  /**
   * Dispara a análise assistida por IA (Gemini) com contexto clínico opcional
   */
  analyze: async (id: number, clinicalContext?: string): Promise<AnalysisDto> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/exams/${id}/analyze`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: clinicalContext ? JSON.stringify({ clinicalContext }) : undefined,
    });

    return handleResponse<AnalysisDto>(res);
  },

  /**
   * Obtém a série de evolução histórica dos analitos do paciente
   */
  getEvolution: async (patientId: number): Promise<AnalyteEvolutionSeries[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/evolution`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<AnalyteEvolutionSeries[]>(res);
  },

  /**
   * Lista todas as análises realizadas para um exame
   */
  listAnalyses: async (examId: number): Promise<AnalysisDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/exams/${examId}/analyses`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<AnalysisDto[]>(res);
  },

  /**
   * Recupera a análise mais recente de um exame (retorna null se não houver)
   */
  getLatestAnalysis: async (id: number): Promise<AnalysisDto | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/exams/${id}/analyses/latest`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 404) {
        return null;
      }

      return handleResponse<AnalysisDto>(res);
    } catch (e: any) {
      if (e?.message && e.message.includes('404')) {
        return null;
      }
      throw e;
    }
  },

  /**
   * Helpers para persistência de sessão (navegação contínua ao recarregar página)
   */
  getActiveExamId: (): number | null => {
    const saved = sessionStorage.getItem('dosecerta_active_exam_id');
    return saved ? parseInt(saved, 10) : null;
  },

  setActiveExamId: (id: number): void => {
    sessionStorage.setItem('dosecerta_active_exam_id', String(id));
  },

  clearActiveExamId: (): void => {
    sessionStorage.removeItem('dosecerta_active_exam_id');
  },
};
