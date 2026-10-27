import React, { useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCw,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ExamSummary, AnalysisDto } from '../../../services/examService';

interface ExamProcessingTimelineProps {
  exam: ExamSummary;
  analysis: AnalysisDto | null;
  analyzingWithAi: boolean;
  onTriggerAiAnalysis: () => void;
  onViewResults: () => void;
  onRetry: () => void;
  onNewExam: () => void;
}

export type StepState = 'completed' | 'current' | 'pending' | 'error';

interface StepInfo {
  id: number;
  title: string;
  description: string;
  state: StepState;
  detail?: string;
}

export default function ExamProcessingTimeline({
  exam,
  analysis,
  analyzingWithAi,
  onTriggerAiAnalysis,
  onViewResults,
  onRetry,
  onNewExam,
}: ExamProcessingTimelineProps) {
  // Mapeamento determinístico das 7 etapas conforme o estado real do backend
  const computeSteps = (): StepInfo[] => {
    const isError = exam.status === 'ERROR';
    const isAiError = analysis?.status === 'ERROR';
    const isAiDone = analysis?.status === 'COMPLETED' || exam.status === 'ANALYZED';
    const isProcessed = exam.status === 'PROCESSED' || isAiDone;

    return [
      {
        id: 1,
        title: 'Upload do documento',
        description: 'Arquivo recebido com sucesso e hash SHA-256 verificado.',
        state: 'completed',
        detail: exam.originalFilename,
      },
      {
        id: 2,
        title: 'Extração de texto / OCR',
        description: isError && exam.errorMessage?.includes('OCR')
          ? 'Falha: documento escaneado sem camada de texto.'
          : 'Leitura e extração do texto do documento PDF.',
        state: isError && exam.errorMessage?.includes('OCR')
          ? 'error'
          : isProcessed
          ? 'completed'
          : 'current',
      },
      {
        id: 3,
        title: 'Identificação dos resultados',
        description: isProcessed
          ? `${exam.resultCount} resultado(s) laboratorial(is) identificado(s).`
          : 'Reconhecimento de analitos, valores, unidades e referências.',
        state: isError && !exam.errorMessage?.includes('OCR')
          ? 'error'
          : isProcessed
          ? 'completed'
          : exam.status === 'PROCESSING'
          ? 'current'
          : 'pending',
      },
      {
        id: 4,
        title: 'Validação e normalização dos dados',
        description: 'Padronização de nomenclaturas e unidades segundo diretrizes.',
        state: isError
          ? 'pending'
          : isProcessed
          ? 'completed'
          : 'pending',
      },
      {
        id: 5,
        title: 'Comparação com referências',
        description: 'Avaliação determinística contra intervalos e metas clínicas.',
        state: isError
          ? 'pending'
          : isProcessed
          ? 'completed'
          : 'pending',
      },
      {
        id: 6,
        title: 'Análise clínica assistida por IA (Gemini)',
        description: isAiError
          ? (analysis?.errorMessage || 'Falha na comunicação com o serviço de IA.')
          : isAiDone
          ? 'Interpretação clínica contextual e identificação de achados concluída.'
          : analyzingWithAi
          ? 'Google Gemini interpretando analitos e correlações clínicas...'
          : isProcessed
          ? 'Aguardando processamento da IA.'
          : 'Pendente após a extração.',
        state: isAiError
          ? 'error'
          : isAiDone
          ? 'completed'
          : analyzingWithAi
          ? 'current'
          : 'pending',
      },
      {
        id: 7,
        title: 'Processamento concluído',
        description: isAiDone
          ? 'Análise e laudo prontos para revisão profissional.'
          : isProcessed && !analyzingWithAi
          ? 'Resultados laboratoriais disponíveis para consulta.'
          : 'Finalização do fluxo de análise.',
        state: isAiDone
          ? 'completed'
          : 'pending',
      },
    ];
  };

  const steps = computeSteps();
  const completedCount = steps.filter((s) => s.state === 'completed').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const isComplete = exam.status === 'ANALYZED' || analysis?.status === 'COMPLETED';
  const hasError = exam.status === 'ERROR' || analysis?.status === 'ERROR';

  // Disparo 100% automático da análise clínica com IA ao alcançar a etapa correspondente
  useEffect(() => {
    if (exam.status === 'PROCESSED' && !analysis && !analyzingWithAi && !hasError) {
      onTriggerAiAnalysis();
    }
  }, [exam.status, analysis, analyzingWithAi, hasError, onTriggerAiAnalysis]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Card do Arquivo (Inspirado na 2ª Imagem de Referência) */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {exam.originalFilename}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isComplete
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : hasError
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    }`}
                  >
                    {isComplete
                      ? 'Análise Concluída'
                      : hasError
                      ? 'Falha no Processamento'
                      : exam.status === 'PROCESSED'
                      ? 'Resultados Extraídos'
                      : 'Processando'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  {exam.laboratory && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Laboratório: <strong className="text-slate-700 dark:text-slate-300">{exam.laboratory}</strong>
                    </span>
                  )}
                  {exam.collectionDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Coleta: <strong className="text-slate-700 dark:text-slate-300">{exam.collectionDate}</strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Resultados: <strong className="text-slate-700 dark:text-slate-300">{exam.resultCount} analitos</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Ações contextuais */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {isComplete ? (
                <Button
                  onClick={onViewResults}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-600/20"
                >
                  Ver Resultados e Análise
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : hasError ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={onNewExam} size="sm">
                    Novo Envio
                  </Button>
                  <Button onClick={onRetry} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                    Tentar Novamente
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  {analyzingWithAi ? 'Analisando com IA (Google Gemini)...' : 'Processando etapas...'}
                </div>
              )}
            </div>
          </div>

          {/* Barra de progresso real */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">Progresso geral do exame</span>
              <span className="font-semibold text-slate-900 dark:text-white">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-slate-100 dark:bg-slate-800" />
          </div>
        </CardContent>
      </Card>

      {/* Linha do Tempo Vertical (Segunda Imagem de Referência) */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Etapas do Processamento Clínico</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {completedCount} de {steps.length} concluídas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <div className="relative pl-6 md:pl-8 space-y-8 before:absolute before:left-3 md:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.id} className="relative flex items-start gap-4 group">
                  {/* Marcador da etapa */}
                  <div
                    className={`absolute -left-6 md:-left-8 top-0.5 w-6 md:w-8 h-6 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
                      step.state === 'completed'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : step.state === 'current'
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-md shadow-blue-500/30 animate-pulse'
                        : step.state === 'error'
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                        : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    {step.state === 'completed' ? (
                      <CheckCircle2 className="w-3.5 md:w-4 h-3.5 md:h-4 stroke-[2.5]" />
                    ) : step.state === 'current' ? (
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                    ) : step.state === 'error' ? (
                      <AlertCircle className="w-3.5 md:w-4 h-3.5 md:h-4" />
                    ) : (
                      <span className="text-xs font-semibold">{step.id}</span>
                    )}
                  </div>

                  {/* Conteúdo textual da etapa */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-semibold transition-colors ${
                          step.state === 'completed'
                            ? 'text-slate-900 dark:text-white'
                            : step.state === 'current'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : step.state === 'error'
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {step.title}
                      </h4>

                      {step.state === 'current' && (
                        <Badge className="text-[10px] py-0 px-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-none animate-pulse">
                          Em andamento
                        </Badge>
                      )}

                      {step.state === 'completed' && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          Concluído
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>

                    {step.detail && (
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-500 pt-0.5">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
