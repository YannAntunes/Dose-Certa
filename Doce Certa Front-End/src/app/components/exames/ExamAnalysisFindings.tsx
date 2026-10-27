import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertOctagon,
  ExternalLink,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { AnalysisDto, FindingSeverity } from '../../../services/examService';

interface ExamAnalysisFindingsProps {
  analysis?: AnalysisDto | null;
}

export default function ExamAnalysisFindings({ analysis }: ExamAnalysisFindingsProps) {
  if (!analysis) {
    return (
      <Card className="p-8 text-center border-slate-200 dark:border-slate-800 space-y-2">
        <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Nenhuma análise disponível
        </p>
        <p className="text-xs text-slate-500">
          Aguardando processamento pelo modelo de inteligência artificial.
        </p>
      </Card>
    );
  }

  const safeFindings = Array.isArray(analysis.findings) ? analysis.findings : [];
  const safeWarnings = Array.isArray(analysis.warnings)
    ? analysis.warnings
    : typeof analysis.warnings === 'string' && (analysis.warnings as string).trim().length > 0
    ? (analysis.warnings as string).split('\n')
    : [];
  const safeSources = Array.isArray(analysis.sources) ? analysis.sources : [];

  const renderSeverityBadge = (severity: FindingSeverity | string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <Badge className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-semibold gap-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            Crítico
          </Badge>
        );
      case 'URGENT':
        return (
          <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Urgente
          </Badge>
        );
      case 'ATTENTION':
        return (
          <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Atenção
          </Badge>
        );
      case 'INFO':
      default:
        return (
          <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-medium gap-1">
            <Info className="w-3.5 h-3.5" />
            Informativo
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo Clínico Produzido pelo Gemini */}
      <Card className="border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Resumo da Análise Assistida (IA)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Modelo: <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">{analysis.modelId || 'Gemini'}</span> • Contrato: <span className="font-mono">{analysis.contractVersion || 'exam-analysis-v1'}</span>
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {safeFindings.length} achados clínicos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal bg-white/70 dark:bg-slate-800/60 p-4 rounded-xl border border-blue-100 dark:border-slate-800">
            {analysis.summary || 'Resumo clínico gerado com base nos analitos identificados no exame.'}
          </p>

          {/* Alertas / Avisos do Modelo */}
          {safeWarnings.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Pontos de Atenção / Limitações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                {safeWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Achados Clínicos Individuais */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
          Achados Clínicos Identificados ({safeFindings.length})
        </h3>

        {safeFindings.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            Nenhum achado clínico adicional destacado para os parâmetros analisados.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeFindings.map((f, idx) => (
              <Card
                key={f.id || idx}
                className={`border transition-all shadow-sm ${
                  f.severity === 'CRITICAL' || f.severity === 'URGENT'
                    ? 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                    : f.severity === 'ATTENTION'
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {f.title || 'Achado Clínico'}
                    </h4>
                    {renderSeverityBadge(f.severity)}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {f.description || ''}
                  </p>

                  {Array.isArray(f.sourceKeys) && f.sourceKeys.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>Fontes: {f.sourceKeys.join(', ')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fontes Oficiais Utilizadas */}
      {safeSources.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Diretrizes e Fontes Clínicas Registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {safeSources.map((s, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{s.title || 'Diretriz'}</span>
                  {s.organization && <Badge variant="outline" className="text-[10px]">{s.organization}</Badge>}
                </div>
                {s.excerpt && <p className="text-slate-600 dark:text-slate-400 italic">"{s.excerpt}"</p>}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 text-[11px] hover:underline flex items-center gap-1 pt-1"
                  >
                    Consultar documento oficial
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer Profissional Obrigatório */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Aviso Profissional — Apoio à Decisão Clínica
          </p>
          <p className="leading-relaxed">
            {analysis.disclaimer ||
              'Esta análise é uma ferramenta de apoio à decisão clínica. Os resultados devem ser avaliados por um profissional de saúde considerando o contexto clínico do paciente. A análise automatizada não substitui a avaliação médica.'}
          </p>
        </div>
      </div>
    </div>
  );
}
