import { useState } from 'react';
import { Clock, RefreshCw, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

interface Historico {
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
  historico: Historico[];
}

export default function Historico({ historico }: HistoricoProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
              <CardDescription>Registro completo de todas as consultas e cálculos realizados</CardDescription>
            </div>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      Nenhuma consulta registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((item) => (
                    <>
                      <TableRow key={item.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>{formatDate(item.data)}</TableCell>
                        <TableCell>{item.paciente}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{item.profissional}</span>
                            <Badge 
                              variant="outline" 
                              className="w-fit mt-1 text-xs"
                            >
                              {item.tipoProfissional === 'medico' ? 'Médico' : 'Enfermeiro'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{item.medicamento}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            {item.resultado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRow === item.id && item.observacoes && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-gray-50">
                            <div className="p-4">
                              <p className="text-sm text-gray-600 mb-1">Observações:</p>
                              <p className="text-sm">{item.observacoes}</p>
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
            <div className="mt-4 text-sm text-gray-600 text-center">
              Total de {historico.length} consulta(s) registrada(s)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
