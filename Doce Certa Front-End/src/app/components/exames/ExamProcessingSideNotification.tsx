import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ExamProcessingSideNotificationProps {
  filename: string;
  progressPercent: number;
  currentStepTitle: string;
  currentStepDescription?: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string | null;
  onViewResults?: () => void;
  onClose?: () => void;
}

export default function ExamProcessingSideNotification({
  filename,
  progressPercent,
  currentStepTitle,
  currentStepDescription,
  isComplete,
  hasError,
  errorMessage,
  onViewResults,
  onClose,
}: ExamProcessingSideNotificationProps) {
  const [minimized, setMinimized] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // O pop-up da porcentagem desaparece sozinho automaticamente quando o processamento termina
  useEffect(() => {
    if (isComplete && onClose) {
      // Exibe os 100% de conclusão por 1.8 segundos para confirmação visual
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1800);

      // Fecha o componente após a animação de saída suave
      const closeTimer = setTimeout(() => {
        onClose();
      }, 2300);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isComplete, onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full transition-all duration-500 ease-out ${
        isFadingOut
          ? 'opacity-0 translate-y-4 pointer-events-none'
          : 'animate-in slide-in-from-bottom-5 fade-in duration-300'
      }`}
    >
      <Card className="border border-blue-200 dark:border-blue-900/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-blue-950/20 rounded-2xl overflow-hidden">
        {/* Top bar do widget */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-slate-800/60 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isComplete ? (
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            ) : hasError ? (
              <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {isComplete ? 'Processamento Concluído' : hasError ? 'Erro no Processamento' : 'Processando Laudo'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
                isComplete
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : hasError
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse'
              }`}
            >
              {progressPercent}%
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMinimized(!minimized)}
              className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo expandido */}
        {!minimized && (
          <CardContent className="p-4 space-y-3">
            {/* Barra de Progresso Animada */}
            <div className="space-y-1.5">
              <Progress
                value={progressPercent}
                className={`h-2 ${
                  isComplete
                    ? '[&>div]:bg-emerald-500'
                    : hasError
                    ? '[&>div]:bg-red-500'
                    : '[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-600'
                }`}
              />
            </div>

            {/* Detalhe da Etapa Atual */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {!isComplete && !hasError && <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />}
                {currentStepTitle}
              </p>
              {currentStepDescription && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {currentStepDescription}
                </p>
              )}
              {hasError && errorMessage && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Botão de Ação no Estado Concluído */}
            {isComplete && onViewResults && (
              <Button
                size="sm"
                onClick={onViewResults}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-md shadow-emerald-600/20"
              >
                Ver Resultados e Análise
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
