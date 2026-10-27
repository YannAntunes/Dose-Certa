import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Sparkles,
  ArrowLeft,
  Printer,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Paciente } from '../../../services/api';
import {
  examService,
  ExamSummary,
  ResultDto,
  AnalysisDto,
} from '../../../services/examService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

import ExamUploadDropzone from './ExamUploadDropzone';
import ExamPatientSelect from './ExamPatientSelect';
import ExamProcessingTimeline from './ExamProcessingTimeline';
import ExamResultsTable from './ExamResultsTable';
import ExamAnalysisFindings from './ExamAnalysisFindings';
import ExamHistoryTrends from './ExamHistoryTrends';
import ExamProcessingSideNotification from './ExamProcessingSideNotification';
import ExamErrorBoundary from './ExamErrorBoundary';

interface ExamAnalysisPageProps {
  pacientes: Paciente[];
}

type ViewMode = 'upload' | 'processing' | 'results';

export default function ExamAnalysisPage({ pacientes }: ExamAnalysisPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedSex, setSelectedSex] = useState<'M' | 'F' | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clinicalContext, setClinicalContext] = useState<string>('');
  const [editingContextInResults, setEditingContextInResults] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [analyzingWithAi, setAnalyzingWithAi] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [activeExam, setActiveExam] = useState<ExamSummary | null>(null);
  const [examResults, setExamResults] = useState<ResultDto[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisDto | null>(null);
  const [patientExams, setPatientExams] = useState<ExamSummary[]>([]);

  const [activeTab, setActiveTab] = useState<'results' | 'findings' | 'history'>('results');

  // Estado para o widget lateral flutuante de progresso
  const [showSideNotification, setShowSideNotification] = useState(false);
  const [sideProgressPercent, setSideProgressPercent] = useState(0);
  const [sideStepTitle, setSideStepTitle] = useState('');
  const [sideStepDesc, setSideStepDesc] = useState('');
  const [sideHasError, setSideHasError] = useState(false);
  const [sideErrorMessage, setSideErrorMessage] = useState<string | null>(null);

  const autoRedirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (autoRedirectTimerRef.current) {
        clearTimeout(autoRedirectTimerRef.current);
      }
    };
  }, []);

  // Recupera o estado persistido ao carregar / recarregar a página
  const loadExamState = useCallback(async (examId: number) => {
    setLoadingData(true);
    try {
      const detail = await examService.getById(examId);
      setActiveExam(detail.exam);
      setExamResults(detail.results || []);
      setSelectedPatientId(String(detail.exam.patientId));

      // Carrega exames do mesmo paciente
      try {
        const patientData = await examService.listByPatient(detail.exam.patientId);
        setPatientExams(patientData.content || []);
      } catch (err) {
        console.warn('Erro ao carregar histórico do paciente:', err);
      }

      // Consulta se já existe análise por IA concluída
      try {
        const latest = await examService.getLatestAnalysis(examId);
        if (latest) {
          setAnalysis(latest);
          if (latest.clinicalContext) {
            setClinicalContext(latest.clinicalContext);
          }
          if (latest.status === 'COMPLETED') {
            setViewMode('results');
          } else {
            setViewMode('processing');
          }
        } else {
          setViewMode('processing');
        }
      } catch {
        setViewMode('processing');
      }
    } catch (error: any) {
      console.error('Erro ao recuperar exame persistido:', error);
      toast.error('Não foi possível restaurar o exame anterior.');
      examService.clearActiveExamId();
      setViewMode('upload');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const savedExamId = examService.getActiveExamId();
    if (savedExamId) {
      loadExamState(savedExamId);
    }
  }, [loadExamState]);

  // Se o paciente mudar, busca os exames existentes dele
  useEffect(() => {
    if (selectedPatientId) {
      examService
        .listByPatient(parseInt(selectedPatientId, 10))
        .then((res) => setPatientExams(res.content || []))
        .catch(() => setPatientExams([]));
    }
  }, [selectedPatientId]);

  // Disparo da Análise Assistida por IA com atualização da notificação lateral e redirecionamento automático a 100%
  const triggerAiAnalysis = async (examId: number, customContext?: string) => {
    setAnalyzingWithAi(true);
    setSideProgressPercent(85);
    setSideStepTitle('Etapa 6/7: Análise clínica com Google Gemini');
    setSideStepDesc('Interpretando analitos extraídos e gerando correlações clínicas...');
    setSideHasError(false);
    setSideErrorMessage(null);

    const ctx = customContext !== undefined ? customContext : clinicalContext;

    try {
      let analysisDto: AnalysisDto;
      try {
        analysisDto = await examService.analyze(examId, ctx ? ctx.trim() : undefined);
      } catch (firstErr) {
        console.warn('Tentativa inicial de análise com IA oscilou, executando retentativa automática em 1.5s...', firstErr);
        await new Promise((res) => setTimeout(res, 1500));
        analysisDto = await examService.analyze(examId, ctx ? ctx.trim() : undefined);
      }
      setAnalysis(analysisDto);

      // Atualiza o exame com status ANALYZED
      const detail = await examService.getById(examId);
      setActiveExam(detail.exam);
      setExamResults(detail.results || []);

      // 100% atingido!
      setSideProgressPercent(100);
      setSideStepTitle('Etapa 7/7: Concluído com Sucesso!');
      setSideStepDesc('Redirecionando para a análise dos resultados...');

      toast.success('Análise clínica por inteligência artificial concluída!');

      // Redirecionamento automático imediato para a tela de resultados e encerramento da notificação
      if (autoRedirectTimerRef.current) {
        clearTimeout(autoRedirectTimerRef.current);
      }
      autoRedirectTimerRef.current = setTimeout(() => {
        setViewMode('results');
        setActiveTab('results');
        setShowSideNotification(false);
      }, 1500);
    } catch (error: any) {
      console.error('Erro na análise com IA:', error);
      setSideHasError(true);
      setSideErrorMessage(error?.message || 'Falha ao comunicar com o modelo Gemini.');
      toast.error(error?.message || 'Não foi possível concluir a análise da IA no momento.');
    } finally {
      setAnalyzingWithAi(false);
    }
  };

  // Envio do exame (Upload + Extração + Disparo automático de IA)
  const handleUpload = async () => {
    if (!selectedPatientId) {
      toast.error('Selecione um paciente para associar ao exame.');
      return;
    }

    if (!selectedFile) {
      toast.error('Selecione um arquivo PDF de exame laboratorial.');
      return;
    }

    setUploading(true);
    setShowSideNotification(true);
    setSideProgressPercent(15);
    setSideStepTitle('Etapa 1/7: Upload do documento');
    setSideStepDesc('Enviando PDF e validando integridade no servidor...');
    setSideHasError(false);
    setSideErrorMessage(null);

    try {
      // 1. Upload e processamento determinístico no backend
      setSideProgressPercent(35);
      setSideStepTitle('Etapa 2/7: Extração de texto e parsing');
      setSideStepDesc('Extraindo tabelas e analitos laboratoriais...');

      const summary = await examService.upload(
        parseInt(selectedPatientId, 10),
        selectedFile,
        selectedSex ? selectedSex : undefined
      );

      setActiveExam(summary);
      examService.setActiveExamId(summary.id);

      setSideProgressPercent(65);
      setSideStepTitle('Etapa 3 a 5/7: Comparação com referências');
      setSideStepDesc('Cruzando analitos com limites laboratoriais...');

      // Carrega os detalhes do exame processado
      const detail = await examService.getById(summary.id);
      setExamResults(detail.results || []);

      setViewMode('processing');
      toast.success('Exame processado! Iniciando interpretação clínica com IA...');

      // Se o exame foi processado, dispara automaticamente a análise com IA
      if (summary.status === 'PROCESSED' || summary.status === 'UPLOADED') {
        await triggerAiAnalysis(summary.id);
      } else if (summary.status === 'ERROR') {
        setSideHasError(true);
        setSideErrorMessage(summary.errorMessage || 'Falha no processamento do documento.');
      }
    } catch (error: any) {
      console.error('Erro no upload do exame:', error);
      setSideHasError(true);
      setSideErrorMessage(error?.message || 'Falha ao enviar e processar o arquivo de exame.');
      toast.error(error?.message || 'Falha ao enviar e processar o arquivo de exame.');
    } finally {
      setUploading(false);
    }
  };

  // Limpa o exame e a seleção do paciente, voltando para a busca/seleção
  const handleResetToPatientSearch = () => {
    examService.clearActiveExamId();
    setActiveExam(null);
    setExamResults([]);
    setAnalysis(null);
    setSelectedFile(null);
    setSelectedPatientId('');
    setSelectedSex('');
    setClinicalContext('');
    setEditingContextInResults(false);
    setShowSideNotification(false);
    setPatientExams([]);
    setViewMode('upload');
    toast.info('Pronto para buscar ou selecionar outro paciente.');
  };

  // Limpa para novo envio
  const handleNewExam = () => {
    examService.clearActiveExamId();
    setActiveExam(null);
    setExamResults([]);
    setAnalysis(null);
    setSelectedFile(null);
    setSelectedPatientId('');
    setSelectedSex('');
    setClinicalContext('');
    setEditingContextInResults(false);
    setShowSideNotification(false);
    setPatientExams([]);
    setViewMode('upload');
  };

  // Impressão / Exportação clínica
  const handlePrint = () => {
    window.print();
  };

  const pacienteAtual = pacientes.find((p) => String(p.id) === selectedPatientId);

  return (
    <ExamErrorBoundary onReset={handleNewExam}>
      <div className="space-y-6">
        {/* Notificação Lateral Flutuante com Progresso e Porcentagens */}
        {showSideNotification && activeExam && (
          <ExamProcessingSideNotification
            filename={activeExam.originalFilename || selectedFile?.name || 'laudo.pdf'}
            progressPercent={sideProgressPercent}
            currentStepTitle={sideStepTitle}
            currentStepDescription={sideStepDesc}
            isComplete={sideProgressPercent === 100 || viewMode === 'results'}
            hasError={sideHasError}
            errorMessage={sideErrorMessage}
            onViewResults={() => {
              setViewMode('results');
              setActiveTab('results');
            }}
            onClose={() => setShowSideNotification(false)}
          />
        )}

        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Análise de Exames
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Envie exames laboratoriais para extração dos resultados e análise clínica assistida.
                </p>
              </div>
            </div>
          </div>

          {/* Ações superiores */}
          <div className="flex flex-wrap items-center gap-2">
            {viewMode !== 'upload' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToPatientSearch}
                  className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium gap-1.5 shadow-sm"
                  title="Voltar para a seleção e busca de pacientes"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Trocar Paciente / Nova Busca
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewExam}
                  className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Novo Exame
                </Button>
              </>
            )}

            {viewMode === 'results' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Laudo
              </Button>
            )}

            {activeExam && viewMode === 'results' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('processing')}
                className="text-xs text-blue-600 dark:text-blue-400"
              >
                Ver Linha do Tempo
              </Button>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* ESTADO 1: TELA INICIAL DE UPLOAD                               */}
        {/* ────────────────────────────────────────────────────────────── */}
        {viewMode === 'upload' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Card com Seletor de Paciente */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                      1. Identificação do Paciente
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Pesquise ou selecione o paciente cadastrado no sistema ao qual este laudo pertence.
                    </CardDescription>
                  </div>
                  {selectedPatientId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPatientId('')}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 gap-1 h-7"
                    >
                      Trocar Paciente
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <ExamPatientSelect
                  pacientes={pacientes}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  selectedSex={selectedSex}
                  onSelectSex={setSelectedSex}
                  disabled={uploading}
                />
              </CardContent>
            </Card>

            {/* Card de Contexto Clínico Opcional */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                      2. Contexto Clínico Pré-Análise
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-normal border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                    Opcional
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Informe queixas, suspeita clínica, medicamentos em uso ou motivo do exame para enriquecer a correlação com a IA (zero dados de identificação pessoal são transmitidos).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <textarea
                  value={clinicalContext}
                  onChange={(e) => setClinicalContext(e.target.value)}
                  placeholder="Ex: Paciente com queixas de cansaço extremo e perda ponderal não intencional há 2 meses. Em uso de Metformina 850mg e Losartana 50mg. Coleta realizada com jejum de 12 horas."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </CardContent>
            </Card>

            {/* Card de Upload com Grande Área Delimitada */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  3. Documento Laboratorial
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  O arquivo será processado de forma segura e os dados clínicos serão anonimizados para a análise assistida.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <ExamUploadDropzone
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  onUpload={handleUpload}
                  uploading={uploading}
                  disabled={!selectedPatientId}
                />
              </CardContent>
            </Card>

            {/* Histórico Prévio do Paciente Selecionado */}
            {selectedPatientId && patientExams.length > 0 && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    Exames Anteriores deste Paciente ({patientExams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {patientExams.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          examService.setActiveExamId(e.id);
                          loadExamState(e.id);
                        }}
                        className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {e.originalFilename}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between">
                          <span>{e.collectionDate || 'Sem data'}</span>
                          <span>{e.resultCount} analito(s)</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────── */}
        {/* ESTADO 2: TELA DE ACOMPANHAMENTO DO PROCESSAMENTO             */}
        {/* ────────────────────────────────────────────────────────────── */}
        {viewMode === 'processing' && activeExam && (
          <div className="space-y-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToPatientSearch}
                className="text-xs text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Trocar Paciente / Voltar para Busca
              </Button>

              {examResults.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewMode('results');
                    setActiveTab('results');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 border-blue-200"
                >
                  Ir para Resultados ({examResults.length})
                </Button>
              )}
            </div>

            <ExamProcessingTimeline
              exam={activeExam}
              analysis={analysis}
              analyzingWithAi={analyzingWithAi}
              onTriggerAiAnalysis={() => triggerAiAnalysis(activeExam.id)}
              onViewResults={() => {
                setViewMode('results');
                setActiveTab('results');
              }}
              onRetry={() => {
                if (activeExam) {
                  triggerAiAnalysis(activeExam.id);
                }
              }}
              onNewExam={handleNewExam}
            />
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────── */}
        {/* ESTADO 3: TELA DE RESULTADO E REVISÃO CLÍNICA                 */}
        {/* ────────────────────────────────────────────────────────────── */}
        {viewMode === 'results' && activeExam && (
          <div className="space-y-6">
            {/* Card Resumo do Exame e Paciente */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Laudo Laboratorial: {activeExam.originalFilename}
                      </h2>
                      <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300">
                        Processado
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Paciente:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {pacienteAtual?.nome || `Paciente #${activeExam.patientId}`}
                        </strong>{' '}
                        • CPF: {pacienteAtual?.cpf || 'Não informado'} • Idade:{' '}
                        {pacienteAtual?.idade !== undefined ? `${pacienteAtual.idade} anos` : 'Não informada'}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResetToPatientSearch}
                        className="text-xs h-6 px-2 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium gap-1"
                        title="Selecionar outro paciente para análise"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Trocar paciente
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    {activeExam.laboratory && (
                      <div className="p-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>{activeExam.laboratory}</span>
                      </div>
                    )}

                    {activeExam.collectionDate && (
                      <div className="p-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Coleta: {activeExam.collectionDate}</span>
                      </div>
                    )}

                    <div className="p-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>{examResults.length} analitos identificados</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Contexto Clínico e Reanálise com IA */}
            <Card className="border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Contexto Clínico do Exame
                      </p>
                      {clinicalContext ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                          &ldquo;{clinicalContext}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Nenhum contexto clínico adicional informado. Você pode adicionar queixas, medicações ou suspeitas para refinamento da análise assistida.
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingContextInResults(!editingContextInResults)}
                    className="text-xs shrink-0 border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300"
                  >
                    {editingContextInResults ? 'Fechar' : clinicalContext ? 'Editar e Reanalisar' : 'Adicionar Contexto'}
                  </Button>
                </div>

                {editingContextInResults && (
                  <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-900/40 space-y-3">
                    <textarea
                      value={clinicalContext}
                      onChange={(e) => setClinicalContext(e.target.value)}
                      placeholder="Descreva queixas clínicas, tempo de jejum, hipóteses diagnósticas ou medicações em uso..."
                      rows={3}
                      className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingContextInResults(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          setEditingContextInResults(false);
                          toast.info('Reanalisando exame com o contexto clínico informado...');
                          await triggerAiAnalysis(activeExam.id, clinicalContext);
                        }}
                        disabled={analyzingWithAi}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Reanalisar com IA
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Abas de Navegação dos Resultados */}
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="results" className="rounded-lg text-xs font-semibold gap-2">
                  <FileText className="w-4 h-4" />
                  Resultados Laboratoriais ({examResults.length})
                </TabsTrigger>
                <TabsTrigger value="findings" className="rounded-lg text-xs font-semibold gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Análise com IA {analysis?.findings && `(${analysis.findings.length})`}
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-2">
                  <History className="w-4 h-4" />
                  Histórico do Paciente ({patientExams.length})
                </TabsTrigger>
              </TabsList>

              {/* Aba 1: Tabela de Resultados Laboratoriais */}
              <TabsContent value="results" className="space-y-4">
                <ExamResultsTable results={examResults} />
              </TabsContent>

              {/* Aba 2: Achados e Resumo Clínico do Gemini */}
              <TabsContent value="findings" className="space-y-4">
                {analysis && analysis.status === 'COMPLETED' ? (
                  <ExamAnalysisFindings analysis={analysis} />
                ) : (
                  <Card className="p-8 text-center border-slate-200 dark:border-slate-800 space-y-3">
                    <Sparkles className="w-8 h-8 text-blue-500 mx-auto animate-pulse" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {analyzingWithAi
                        ? 'Google Gemini interpretando analitos e correlações clínicas...'
                        : 'Processando interpretação clínica com Inteligência Artificial...'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Os analitos extraídos estão sendo interpretados de forma automatizada pelo modelo Google Gemini
                      com base nas diretrizes clínicas e faixas de referência.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium pt-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Análise clínica em andamento...</span>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Aba 3: Histórico e Tendências */}
              <TabsContent value="history" className="space-y-4">
                <ExamHistoryTrends
                  currentExamId={activeExam.id}
                  patientExams={patientExams}
                  onSelectExam={(id) => {
                    examService.setActiveExamId(id);
                    loadExamState(id);
                  }}
                  loading={loadingData}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </ExamErrorBoundary>
  );
}
