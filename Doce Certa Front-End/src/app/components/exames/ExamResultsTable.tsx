import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  MinusCircle,
  FileText,
  Info,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { ResultDto, ResultStatus } from '../../../services/examService';

interface ExamResultsTableProps {
  results?: ResultDto[];
}

function getContextReasonDetails(code?: string | null, justification?: string | null) {
  switch (code) {
    case 'MISSING_PATIENT_INFORMATION':
      return {
        categoryTitle: 'Informações Demográficas / Cadastrais Ausentes',
        impediment: 'Dados indispensáveis como idade ou sexo biológico do paciente não constam no cadastro ou não foram fornecidos no envio.',
        clinicalRelevance: 'Analitos como Hemoglobina, Hematócrito, Creatinina, Ferritina, AST e ALT possuem intervalos de referência estritamente dependentes de idade e sexo biológico. Classificar sem esses parâmetros geraria falsa interpretação.',
        recommendedAction: 'Atualizar o cadastro do paciente informando sexo biológico e idade, ou selecionar o sexo biológico no formulário de envio do laudo.',
      };
    case 'CONFLICTING_REFERENCE_RANGES':
      return {
        categoryTitle: 'Faixas de Referência Múltiplas ou Conflitantes',
        impediment: 'O laudo ou a diretriz estabelece faixas distintas para diferentes subgrupos (ex: gestantes, risco cardiovascular baixo/alto, tabagistas, pós-menopausa).',
        clinicalRelevance: 'A meta ou normalidade depende da estratificação clínica individual do paciente, não havendo um único intervalo universal.',
        recommendedAction: 'Consultar o laudo original e preencher a estratificação clínica do paciente no campo de Contexto Clínico Pré-Análise.',
      };
    case 'UNIT_AMBIGUITY':
      return {
        categoryTitle: 'Ambiguidade ou Incompatibilidade de Unidade',
        impediment: 'A unidade de medida extraída do resultado não possui conversão direta e unívoca com a referência padrão cadastrada.',
        clinicalRelevance: 'Comparar valores com unidades incompatíveis pode simular alterações clínicas inexistentes ou mascarar desvios críticos.',
        recommendedAction: 'Verificar a unidade impressa no laudo original e checar se o método laboratorial adotou uma escala particular.',
      };
    case 'METHOD_COMPARABILITY_UNKNOWN':
      return {
        categoryTitle: 'Metodologia Analítica Não Padronizada',
        impediment: 'O laudo descreve metodologia específica com notas técnicas que não puderam ser estruturadas de forma estritamente numérica.',
        clinicalRelevance: 'Ensaios proprietários demandam interpretação do texto descritivo do laboratório em conjunto com o contexto clínico.',
        recommendedAction: 'Revisar as notas de rodapé do documento de exame original e correlacionar com o quadro clínico.',
      };
    case 'RESULT_REQUIRES_CLINICAL_CORRELATION':
    default:
      return {
        categoryTitle: 'Exige Correlação com Quadro Clínico e Medicamentos',
        impediment: justification || 'O resultado encontra-se em faixa limítrofe ou trata-se de marcador que varia com medicações, dieta ou sintomas.',
        clinicalRelevance: 'O significado prognóstico ou terapêutico deste analito só pode ser determinado com base no quadro clínico geral, tempo de jejum e remédios em uso.',
        recommendedAction: 'Informar queixas, sintomas, hipótese diagnóstica e medicamentos atuais no campo de Contexto Clínico Adicional da IA.',
      };
  }
}

export default function ExamResultsTable({ results = [] }: ExamResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<ResultDto | null>(null);
  const [reasonModalResult, setReasonModalResult] = useState<ResultDto | null>(null);

  const safeResults = results || [];

  // Contadores rápidos de status
  const counts = useMemo(() => {
    return {
      total: safeResults.length,
      altered: safeResults.filter(
        (r) =>
          r.status === 'ABOVE_REFERENCE' ||
          r.status === 'BELOW_REFERENCE' ||
          r.status === 'CRITICAL_HIGH' ||
          r.status === 'CRITICAL_LOW'
      ).length,
      within: safeResults.filter((r) => r.status === 'WITHIN_REFERENCE').length,
      noRef: safeResults.filter(
        (r) =>
          r.status === 'NO_REFERENCE' ||
          r.status === 'NEEDS_CONTEXT' ||
          (r.status as string) === 'REQUIRES_CONTEXT'
      ).length,
    };
  }, [safeResults]);

  // Filtragem combinada
  const filteredResults = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();

    return safeResults.filter((r) => {
      const normName = r.normalizedName ? String(r.normalizedName).toLowerCase() : '';
      const origName = r.originalName ? String(r.originalName).toLowerCase() : '';
      const code = r.testCode ? String(r.testCode).toLowerCase() : '';

      const matchSearch = !q || normName.includes(q) || origName.includes(q) || code.includes(q);
      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'altered') {
        return (
          r.status === 'ABOVE_REFERENCE' ||
          r.status === 'BELOW_REFERENCE' ||
          r.status === 'CRITICAL_HIGH' ||
          r.status === 'CRITICAL_LOW'
        );
      }
      if (statusFilter === 'within') return r.status === 'WITHIN_REFERENCE';
      if (statusFilter === 'no_ref') {
        return (
          r.status === 'NO_REFERENCE' ||
          r.status === 'NEEDS_CONTEXT' ||
          (r.status as string) === 'REQUIRES_CONTEXT'
        );
      }

      return true;
    });
  }, [safeResults, searchTerm, statusFilter]);

  const renderStatusBadge = (status: ResultStatus | string) => {
    switch (status) {
      case 'WITHIN_REFERENCE':
        return (
          <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-medium gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Normal / Na referência
          </Badge>
        );
      case 'ABOVE_REFERENCE':
        return (
          <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-medium gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Acima da referência
          </Badge>
        );
      case 'BELOW_REFERENCE':
        return (
          <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-medium gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Abaixo da referência
          </Badge>
        );
      case 'CRITICAL_HIGH':
      case 'CRITICAL_LOW':
        return (
          <Badge className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 font-medium gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            {status === 'CRITICAL_HIGH' ? 'Crítico (Alto)' : 'Crítico (Baixo)'}
          </Badge>
        );
      case 'NEEDS_CONTEXT':
      case 'REQUIRES_CONTEXT':
        return (
          <Badge className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-medium gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Necessita contexto
          </Badge>
        );
      case 'NO_REFERENCE':
      default:
        return (
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium gap-1">
            <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
            Sem referência
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Chips de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-blue-600 text-white' : ''}
          >
            Todos ({counts.total})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'altered' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('altered')}
            className={
              statusFilter === 'altered'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            }
          >
            Alterados ({counts.altered})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'within' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('within')}
            className={
              statusFilter === 'within'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            }
          >
            Na Referência ({counts.within})
          </Button>
          {counts.noRef > 0 && (
            <Button
              size="sm"
              variant={statusFilter === 'no_ref' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('no_ref')}
              className={statusFilter === 'no_ref' ? 'bg-slate-700 text-white' : ''}
            >
              Sem Ref. ({counts.noRef})
            </Button>
          )}
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por analito..."
            className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Tabela Responsiva */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
              <TableRow className="border-slate-200 dark:border-slate-800">
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Exame / Analito</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Resultado</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Unidade</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Referência do Laboratório</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Status Clínico</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400">
                    Nenhum resultado laboratorial corresponde aos filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((r) => {
                  const isAltered =
                    r.status === 'ABOVE_REFERENCE' ||
                    r.status === 'BELOW_REFERENCE' ||
                    r.status === 'CRITICAL_HIGH' ||
                    r.status === 'CRITICAL_LOW';

                  return (
                    <TableRow
                      key={r.id}
                      className={`border-slate-100 dark:border-slate-800 transition-colors ${
                        isAltered ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Exame / Analito */}
                      <TableCell className="py-3 font-medium">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {r.normalizedName || r.originalName || 'Analito'}
                          </p>
                          {r.normalizedName && r.originalName && r.originalName !== r.normalizedName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                              Laudo: {r.originalName}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Resultado */}
                      <TableCell className="py-3 text-right">
                        <span
                          className={`text-sm font-bold ${
                            isAltered
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {r.numericValue !== null && r.numericValue !== undefined && !isNaN(Number(r.numericValue))
                            ? Number(r.numericValue).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                            : r.textValue || '—'}
                        </span>
                      </TableCell>

                      {/* Unidade */}
                      <TableCell className="py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        {r.normalizedUnit || r.originalUnit || '—'}
                      </TableCell>

                      {/* Referência */}
                      <TableCell className="py-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {r.referenceText ? (
                          <span>{r.referenceText}</span>
                        ) : (
                          <span className="text-slate-400 italic">Sem referência disponível</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {renderStatusBadge(r.status)}
                          {(r.status === 'REQUIRES_CONTEXT' || r.status === 'NEEDS_CONTEXT') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReasonModalResult(r)}
                              className="h-6 px-2 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 rounded-md gap-1"
                              title="Ver por que este analito necessita de contexto clínico"
                            >
                              <HelpCircle className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              Entender o motivo
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Detalhes */}
                      <TableCell className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedResult(r)}
                          className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          <Info className="w-3.5 h-3.5 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Detalhes do Analito */}
      {selectedResult && (
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedResult.normalizedName || selectedResult.originalName || 'Detalhes do Analito'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Código normalizado: <span className="font-mono">{selectedResult.testCode || 'Não catalogado'}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500">Valor extraído</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedResult.numericValue !== null && selectedResult.numericValue !== undefined
                      ? selectedResult.numericValue
                      : selectedResult.textValue || '—'}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {selectedResult.normalizedUnit || selectedResult.originalUnit || ''}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Classificação</p>
                  <div className="pt-1">{renderStatusBadge(selectedResult.status)}</div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Justificativa da Comparação:
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {selectedResult.statusJustification ||
                    'Comparação determinística realizada com base na referência extraída do laudo.'}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>Referência Original do Laudo:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {selectedResult.referenceText || 'Não identificada'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>Origem da Referência:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {selectedResult.appliedReference === 'LABORATORY'
                      ? 'Referência do próprio laboratório'
                      : selectedResult.appliedReference === 'CLINICAL_TARGET'
                      ? 'Meta clínica oficial'
                      : 'Nenhuma'}
                  </span>
                </div>
                {selectedResult.sourcePage && (
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>Página no PDF:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      Página {selectedResult.sourcePage}
                    </span>
                  </div>
                )}
                {selectedResult.notes && (
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>Observações:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-right max-w-xs">
                      {selectedResult.notes}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span>Confiança da extração:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedResult.confidence !== null && selectedResult.confidence !== undefined
                      ? Math.round(selectedResult.confidence * 100)
                      : 100}%
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Específico: Entender o Motivo da Necessidade de Contexto Clínico */}
      {reasonModalResult && (
        <ContextReasonModal
          result={reasonModalResult}
          onClose={() => setReasonModalResult(null)}
        />
      )}
    </div>
  );
}

function ContextReasonModal({
  result,
  onClose,
}: {
  result: ResultDto;
  onClose: () => void;
}) {
  const details = getContextReasonDetails(
    result.contextReasonCode,
    result.statusJustification
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <HelpCircle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Apoio à Decisão Clínica</span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Por que este analito necessita de contexto?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {result.normalizedName || result.originalName} • Valor extraído:{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {result.numericValue !== null && result.numericValue !== undefined
                ? result.numericValue
                : result.textValue || '—'}{' '}
              {result.normalizedUnit || result.originalUnit || ''}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Categoria Estruturada */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300 font-semibold">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>{details.categoryTitle}</span>
            </div>
            <p className="text-purple-700 dark:text-purple-300/90 leading-relaxed">
              {details.impediment}
            </p>
          </div>

          {/* Justificativa do Sistema */}
          {result.statusJustification && (
            <div className="space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Justificativa Técnica do Motor de Referências:
              </p>
              <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 leading-relaxed font-mono text-[11px]">
                {result.statusJustification}
              </p>
            </div>
          )}

          {/* Relevância Clínica */}
          <div className="space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Relevância Clínica da Interpretação Contextual:
            </p>
            <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 leading-relaxed">
              {details.clinicalRelevance}
            </p>
          </div>

          {/* Ação Recomendada */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-semibold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Ação Recomendada para o Profissional:</span>
            </div>
            <p className="text-blue-700 dark:text-blue-300/90 leading-relaxed">
              {details.recommendedAction}
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-xs border-slate-200 dark:border-slate-700"
            >
              Entendido / Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
