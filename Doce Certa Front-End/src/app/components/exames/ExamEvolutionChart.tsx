import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  LineChart,
  Table as TableIcon,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
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
  examService,
  AnalyteEvolutionSeries,
  AnalyteEvolutionPoint,
} from '../../../services/examService';

interface ExamEvolutionChartProps {
  patientId: number;
  initialSeries?: AnalyteEvolutionSeries[];
  onSelectExam?: (examId: number) => void;
}

export default function ExamEvolutionChart({
  patientId,
  initialSeries,
  onSelectExam,
}: ExamEvolutionChartProps) {
  const [seriesList, setSeriesList] = useState<AnalyteEvolutionSeries[]>(initialSeries || []);
  const [loading, setLoading] = useState<boolean>(!initialSeries);
  const [selectedTestCode, setSelectedTestCode] = useState<string>('');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredPoint, setHoveredPoint] = useState<AnalyteEvolutionPoint | null>(null);

  const loadData = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await examService.getEvolution(patientId);
      setSeriesList(data || []);
      if (data && data.length > 0 && !selectedTestCode) {
        // Seleciona preferencialmente um analito com >= 2 pontos, ou o primeiro
        const firstMulti = data.find((s) => s.points.length >= 2) || data[0];
        setSelectedTestCode(firstMulti.testCode);
      }
    } catch (err) {
      console.error('Erro ao carregar séries de evolução:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSeries) {
      loadData();
    } else {
      setSeriesList(initialSeries);
      if (initialSeries.length > 0 && !selectedTestCode) {
        const firstMulti = initialSeries.find((s) => s.points.length >= 2) || initialSeries[0];
        setSelectedTestCode(firstMulti.testCode);
      }
    }
  }, [patientId, initialSeries]);

  const activeSeries = useMemo(() => {
    return seriesList.find((s) => s.testCode === selectedTestCode) || seriesList[0] || null;
  }, [seriesList, selectedTestCode]);

  // Cálculos do gráfico SVG
  const chartMetrics = useMemo(() => {
    if (!activeSeries || activeSeries.points.length === 0) return null;

    const validPoints = activeSeries.points.filter(
      (p) => p.numericValue !== null && !isNaN(Number(p.numericValue))
    );
    if (validPoints.length === 0) return null;

    const values = validPoints.map((p) => Number(p.numericValue));
    if (activeSeries.refLower !== null) values.push(Number(activeSeries.refLower));
    if (activeSeries.refUpper !== null) values.push(Number(activeSeries.refUpper));

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.15 || 5;
    const yMin = Math.max(0, minVal - padding);
    const yMax = maxVal + padding;

    const width = 640;
    const height = 260;
    const margin = { top: 20, right: 30, bottom: 45, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const scaleY = (val: number) => {
      if (yMax === yMin) return innerHeight / 2;
      return innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;
    };

    const scaleX = (index: number) => {
      if (validPoints.length === 1) return innerWidth / 2;
      return (index / (validPoints.length - 1)) * innerWidth;
    };

    const coords = validPoints.map((p, idx) => ({
      point: p,
      x: margin.left + scaleX(idx),
      y: margin.top + scaleY(Number(p.numericValue)),
    }));

    const pathData = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    let refAreaPath = null;
    let refLowerY = null;
    let refUpperY = null;

    if (activeSeries.refLower !== null && activeSeries.refUpper !== null) {
      refLowerY = margin.top + scaleY(Number(activeSeries.refLower));
      refUpperY = margin.top + scaleY(Number(activeSeries.refUpper));
      refAreaPath = `M ${margin.left} ${refUpperY} L ${margin.left + innerWidth} ${refUpperY} L ${
        margin.left + innerWidth
      } ${refLowerY} L ${margin.left} ${refLowerY} Z`;
    }

    return {
      width,
      height,
      margin,
      coords,
      pathData,
      refAreaPath,
      refLowerY,
      refUpperY,
      yMin,
      yMax,
    };
  }, [activeSeries]);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-8 text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Carregando histórico e evolução dos exames...
        </CardContent>
      </Card>
    );
  }

  if (seriesList.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Nenhum exame numérico processado para este paciente
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Assim que laudos laboratoriais forem enviados e os resultados forem extraídos, o sistema construirá
            automaticamente os gráficos de acompanhamento para analitos repetidos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Evolução Temporal dos Exames Laboratoriais
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento de analitos comparáveis ao longo do tempo com faixas de referência clínica
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className={`h-8 text-xs gap-1.5 ${
                viewMode === 'chart' ? 'bg-blue-600 text-white' : 'dark:border-slate-700'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              Gráfico
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 text-xs gap-1.5 ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'dark:border-slate-700'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabela Acessível
            </Button>
          </div>
        </div>

        {/* Barra de seleção rápida de analitos */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3">
          {seriesList.map((s) => {
            const isSelected = s.testCode === selectedTestCode;
            const hasMultiple = s.points.length >= 2;

            return (
              <button
                key={s.testCode}
                onClick={() => setSelectedTestCode(s.testCode)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{s.canonicalName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-blue-700 text-blue-100'
                      : hasMultiple
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {s.points.length} {s.points.length === 1 ? 'pt' : 'pts'}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {activeSeries && (
          <div className="space-y-4">
            {/* Cabeçalho do Analito Selecionado */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeSeries.canonicalName}{' '}
                  <span className="text-xs font-normal text-slate-500 font-mono">
                    ({activeSeries.unit})
                  </span>
                </p>
                {activeSeries.refSource && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Fonte da Referência:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {activeSeries.refSource}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                {activeSeries.refLower !== null && activeSeries.refUpper !== null ? (
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-normal">
                    Faixa Alvo: {activeSeries.refLower} a {activeSeries.refUpper} {activeSeries.unit}
                  </Badge>
                ) : activeSeries.refUpper !== null ? (
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-normal">
                    Limite: &le; {activeSeries.refUpper} {activeSeries.unit}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">
                    Sem faixa padrão cadastrada
                  </Badge>
                )}
              </div>
            </div>

            {/* Aviso quando houver apenas 1 ponto */}
            {activeSeries.points.length < 2 && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Histórico com registro único</p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                    São necessários pelo menos 2 registros comparáveis para traçar a curva de evolução
                    temporal deste analito. Atualmente há 1 medição registrada em{' '}
                    <strong>{formatDate(activeSeries.points[0].collectionDate)}</strong> com valor{' '}
                    <strong>
                      {activeSeries.points[0].numericValue} {activeSeries.unit}
                    </strong>
                    . Novos laudos contendo este analito serão integrados automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* MODO GRÁFICO */}
            {viewMode === 'chart' && (
              <div className="relative">
                {chartMetrics ? (
                  <div className="w-full overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
                      className="w-full h-64 select-none"
                    >
                      {/* Grid Horizontal */}
                      <line
                        x1={chartMetrics.margin.left}
                        y1={chartMetrics.margin.top}
                        x2={chartMetrics.width - chartMetrics.margin.right}
                        y2={chartMetrics.margin.top}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800 stroke-dasharray-2"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={chartMetrics.margin.left}
                        y1={chartMetrics.height - chartMetrics.margin.bottom}
                        x2={chartMetrics.width - chartMetrics.margin.right}
                        y2={chartMetrics.height - chartMetrics.margin.bottom}
                        stroke="currentColor"
                        className="text-slate-300 dark:text-slate-700"
                        strokeWidth="1.5"
                      />

                      {/* Faixa de Referência Verde Sombreada */}
                      {chartMetrics.refAreaPath && (
                        <path
                          d={chartMetrics.refAreaPath}
                          className="fill-emerald-500/10 dark:fill-emerald-400/10"
                        />
                      )}
                      {chartMetrics.refUpperY !== null && (
                        <line
                          x1={chartMetrics.margin.left}
                          y1={chartMetrics.refUpperY}
                          x2={chartMetrics.width - chartMetrics.margin.right}
                          y2={chartMetrics.refUpperY}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                      )}
                      {chartMetrics.refLowerY !== null && (
                        <line
                          x1={chartMetrics.margin.left}
                          y1={chartMetrics.refLowerY}
                          x2={chartMetrics.width - chartMetrics.margin.right}
                          y2={chartMetrics.refLowerY}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                      )}

                      {/* Linha de Evolução dos Valores */}
                      {chartMetrics.coords.length >= 2 && (
                        <path
                          d={chartMetrics.pathData}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Pontos no Gráfico */}
                      {chartMetrics.coords.map(({ point, x, y }) => {
                        const isHovered = hoveredPoint?.resultId === point.resultId;
                        const isNormal = point.status === 'WITHIN_REFERENCE';

                        return (
                          <g
                            key={point.resultId}
                            className="cursor-pointer transition-transform"
                            onMouseEnter={() => setHoveredPoint(point)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            onClick={() => onSelectExam?.(point.examId)}
                          >
                            <circle
                              cx={x}
                              cy={y}
                              r={isHovered ? 7 : 5}
                              fill={isNormal ? '#10b981' : '#f59e0b'}
                              stroke="#ffffff"
                              strokeWidth={2}
                              className="transition-all shadow"
                            />
                            {/* Rótulo de data no eixo X */}
                            <text
                              x={x}
                              y={chartMetrics.height - 15}
                              textAnchor="middle"
                              className="text-[10px] fill-slate-500 dark:fill-slate-400 font-sans"
                            >
                              {formatDate(point.collectionDate)}
                            </text>
                            {/* Valor numérico acima do ponto */}
                            <text
                              x={x}
                              y={y - 10}
                              textAnchor="middle"
                              className="text-[11px] font-bold fill-slate-800 dark:fill-slate-100"
                            >
                              {point.numericValue}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Dados insuficientes para desenhar o gráfico.
                  </p>
                )}

                {/* Card de Detalhe Flutuante ao Passar o Mouse */}
                {hoveredPoint && (
                  <div className="absolute top-2 right-2 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg text-xs space-y-1 animate-in fade-in duration-200">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {formatDate(hoveredPoint.collectionDate)}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      Resultado:{' '}
                      <strong className="text-blue-600 dark:text-blue-400">
                        {hoveredPoint.numericValue} {hoveredPoint.unit}
                      </strong>
                    </p>
                    {hoveredPoint.laboratory && (
                      <p className="text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {hoveredPoint.laboratory}
                      </p>
                    )}
                    <div className="pt-1">
                      <Badge
                        className={
                          hoveredPoint.status === 'WITHIN_REFERENCE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {hoveredPoint.status === 'WITHIN_REFERENCE'
                          ? 'Dentro da Referência'
                          : 'Alterado'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODO TABELA ACESSÍVEL */}
            {viewMode === 'table' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                        Data de Coleta
                      </TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">
                        Valor Obtido
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                        Unidade
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                        Faixa de Referência
                      </TableHead>
                      <TableHead className="text-center text-slate-700 dark:text-slate-300 font-semibold">
                        Status Clínico
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                        Laboratório
                      </TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">
                        Ação
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSeries.points.map((p) => {
                      const isNormal = p.status === 'WITHIN_REFERENCE';
                      return (
                        <TableRow
                          key={p.resultId}
                          className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <TableCell className="font-medium text-slate-900 dark:text-white">
                            {formatDate(p.collectionDate)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 dark:text-white">
                            {p.numericValue !== null && p.numericValue !== undefined
                              ? p.numericValue
                              : p.textValue || '—'}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">
                            {p.unit}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {activeSeries.refLower !== null && activeSeries.refUpper !== null
                              ? `${activeSeries.refLower} - ${activeSeries.refUpper}`
                              : activeSeries.refUpper !== null
                              ? `≤ ${activeSeries.refUpper}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                isNormal
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }
                            >
                              {isNormal ? 'Normal' : 'Alterado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {p.laboratory || 'Laboratório do laudo'}
                          </TableCell>
                          <TableCell className="text-right">
                            {onSelectExam && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSelectExam(p.examId)}
                                className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800"
                              >
                                Ver Exame
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
