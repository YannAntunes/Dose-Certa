import { useState, Fragment } from 'react';
import { Clock, RefreshCw, Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { useLanguage } from '../../contexts/LanguageContext';

interface HistoricoItem {
  id: number;
  data: string;
  paciente: string;
  profissional: string;
  tipoProfissional: string;
  medicamento: string;
  resultado: string;
  observacoes?: string;
}

interface HistoricoProps {
  historico: HistoricoItem[];
  /** Callback para reabrir um atendimento na aba Consulta */
  onReabrirConsulta: (item: HistoricoItem) => void;
  onRefresh?: () => void;
}

export default function Historico({
  historico,
  onReabrirConsulta,
  onRefresh
}: HistoricoProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const { t, language } = useLanguage();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Clock className="w-5 h-5 text-indigo-500" />
                {t('historico.title')}
              </CardTitle>
              <CardDescription className="dark:text-slate-400">
                {t('historico.desc')}
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-700 dark:text-slate-300" onClick={() => onRefresh?.()}>
              <RefreshCw className="w-4 h-4" />
              {language === 'pt' ? 'Atualizar' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                  <TableHead className="text-slate-600 dark:text-slate-300">{language === 'pt' ? 'Data/Hora' : 'Date/Time'}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('consulta.paciente')}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{language === 'pt' ? 'Profissional' : 'Professional'}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('consulta.med')}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{language === 'pt' ? 'Resultado' : 'Result'}</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-10">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {t('historico.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((item) => (
                    <Fragment key={item.id}>
                      <TableRow
                        key={item.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-200 dark:border-slate-800 ${expandedRow === item.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                      >
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(item.data)}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">{item.paciente}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-slate-700 dark:text-slate-300">{item.profissional}</span>
                            <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 border-slate-200 dark:border-slate-700 dark:text-slate-400">
                              {item.tipoProfissional === 'medico' ? t('consulta.prof.medico') : t('consulta.prof.enfermeiro')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700 dark:text-slate-300">{item.medicamento}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                            {item.resultado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver prescrição */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title={language === 'pt' ? 'Ver prescrição' : 'View prescription'}
                              onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                              className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            >
                              {expandedRow === item.id
                                ? <ChevronUp className="w-4 h-4" />
                                : <Eye className="w-4 h-4" />
                              }
                            </Button>

                            {/* Reabrir na Consulta */}
                            <Button
                              variant="outline"
                              size="sm"
                              title={language === 'pt' ? 'Reabrir este atendimento' : 'Reopen this consultation'}
                              onClick={() => onReabrirConsulta(item)}
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-indigo-900/30 dark:border-indigo-900 gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {language === 'pt' ? 'Abrir' : 'Open'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linha expandida com a prescrição */}
                      {expandedRow === item.id && (
                        <TableRow key={`${item.id}-detail`} className="border-none">
                          <TableCell colSpan={6} className="bg-slate-50/30 dark:bg-slate-800/30 p-0">
                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-3">
                                {language === 'pt' ? 'PRESCRIÇÃO / OBSERVAÇÕES' : 'PRESCRIPTION / NOTES'}
                              </p>
                              {item.observacoes ? (
                                <pre className="text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap bg-white/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 max-h-64 overflow-y-auto shadow-inner">
                                  {item.observacoes}
                                </pre>
                              ) : (
                                <p className="text-sm text-slate-400 italic">{language === 'pt' ? 'Sem observações registradas.' : 'No notes recorded.'}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {historico.length > 0 && (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 text-center">
              {language === 'pt' ? 'Total de' : 'Total of'} <strong>{historico.length}</strong> {language === 'pt' ? 'consulta(s) registrada(s)' : 'consultation(s) recorded'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
