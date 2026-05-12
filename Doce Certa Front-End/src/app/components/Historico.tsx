import { useState } from 'react';
import { Clock, RefreshCw, Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

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

export default function Historico({ historico, onReabrirConsulta, onRefresh }: HistoricoProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico de Consultas
              </CardTitle>
              <CardDescription>
                Registro completo de todas as consultas e cálculos realizados
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => onRefresh?.()}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-10">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhuma consulta registrada ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((item) => (
                    <>
                      <TableRow
                        key={item.id}
                        className={`hover:bg-gray-50 transition-colors ${expandedRow === item.id ? 'bg-blue-50' : ''}`}
                      >
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(item.data)}
                        </TableCell>
                        <TableCell className="font-medium">{item.paciente}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{item.profissional}</span>
                            <Badge variant="outline" className="w-fit text-xs">
                              {item.tipoProfissional === 'medico' ? 'Médico' : 'Enfermeiro'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.medicamento}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border border-green-200">
                            {item.resultado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver prescrição */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ver prescrição"
                              onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                              className="text-gray-500 hover:text-gray-700"
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
                              title="Reabrir este atendimento na aba Consulta"
                              onClick={() => onReabrirConsulta(item)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Abrir Consulta
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linha expandida com a prescrição */}
                      {expandedRow === item.id && (
                        <TableRow key={`${item.id}-detail`}>
                          <TableCell colSpan={6} className="bg-gray-50 p-0">
                            <div className="p-4 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Prescrição / Observações
                              </p>
                              {item.observacoes ? (
                                <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap bg-white border border-gray-200 rounded p-4 max-h-64 overflow-y-auto">
                                  {item.observacoes}
                                </pre>
                              ) : (
                                <p className="text-sm text-gray-400 italic">Sem observações registradas.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {historico.length > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Total de <strong>{historico.length}</strong> consulta(s) registrada(s)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
