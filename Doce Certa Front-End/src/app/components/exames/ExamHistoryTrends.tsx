import React from 'react';
import { History, FileText, Calendar, Building2, ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExamSummary } from '../../../services/examService';
import ExamEvolutionChart from './ExamEvolutionChart';

interface ExamHistoryTrendsProps {
  currentExamId: number;
  patientExams: ExamSummary[];
  onSelectExam: (examId: number) => void;
  loading: boolean;
}

export default function ExamHistoryTrends({
  currentExamId,
  patientExams,
  onSelectExam,
  loading,
}: ExamHistoryTrendsProps) {
  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Carregando histórico do paciente...
      </div>
    );
  }

  const patientId = patientExams.length > 0 ? patientExams[0].patientId : null;

  return (
    <div className="space-y-6">
      {/* Gráfico de Evolução dos Analitos Comparáveis */}
      {patientId && (
        <ExamEvolutionChart patientId={patientId} onSelectExam={onSelectExam} />
      )}

      {/* Lista de Arquivos de Exame */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Laudos Arquivados do Paciente
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total de {patientExams.length} exame(s) arquivado(s)
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          {patientExams.length <= 1 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Primeiro exame deste paciente
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Quando novos exames laboratoriais forem enviados para este mesmo paciente, o sistema traçará
                automaticamente a evolução cronológica dos analitos (ex: glicemia, colesterol, creatinina).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Selecione um exame anterior para comparar resultados e visualizar os laudos passados:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patientExams.map((e) => {
                  const isCurrent = e.id === currentExamId;

                  return (
                    <div
                      key={e.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {e.originalFilename}
                          </p>
                          {isCurrent && (
                            <Badge className="text-[10px] bg-blue-600 text-white">Atual</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          {e.collectionDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {e.collectionDate}
                            </span>
                          )}
                          {e.laboratory && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {e.laboratory}
                            </span>
                          )}
                          <span>{e.resultCount} analitos</span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectExam(e.id)}
                          className="text-xs shrink-0"
                        >
                          Visualizar
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
