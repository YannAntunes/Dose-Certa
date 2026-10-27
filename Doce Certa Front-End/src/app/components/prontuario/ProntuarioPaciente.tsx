import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  ArrowLeft,
  Calendar,
  Clock,
  FileSpreadsheet,
  FileText,
  Activity,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  Building2,
  Stethoscope,
  Pill,
  ExternalLink,
  RefreshCw,
  Eye,
  AlertTriangle,
  Scale,
  Globe,
  IdCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Paciente, Historico, historicoService } from '../../../services/api';
import {
  examService,
  ExamSummary,
  ExamDetail,
  AnalysisDto,
  AnalyteEvolutionSeries,
} from '../../../services/examService';
import ExamEvolutionChart from '../exames/ExamEvolutionChart';
import ExamResultsTable from '../exames/ExamResultsTable';
import ExamAnalysisFindings from '../exames/ExamAnalysisFindings';
import { toast } from 'sonner';

interface ProntuarioPacienteProps {
  paciente: Paciente;
  onVoltar: () => void;
  onReabrirConsulta: (item: any) => void;
  onNovoAtendimento?: (paciente: Paciente) => void;
  onVerExame?: (examId: number) => void;
}

export default function ProntuarioPaciente({
  paciente,
  onVoltar,
  onReabrirConsulta,
  onNovoAtendimento,
  onVerExame,
}: ProntuarioPacienteProps) {
  const [activeTab, setActiveTab] = useState<string>('visao-geral');
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<Historico[]>([]);
  const [exames, setExames] = useState<ExamSummary[]>([]);
  const [evolutionSeries, setEvolutionSeries] = useState<AnalyteEvolutionSeries[]>([]);

  // Modais de inspeção interna
  const [inspectingExam, setInspectingExam] = useState<ExamDetail | null>(null);
  const [inspectingAnalysis, setInspectingAnalysis] = useState<AnalysisDto | null>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  const carregarDadosDoProntuario = useCallback(async () => {
    setLoading(true);
    try {
      const [consultasRes, examesRes, evolutionRes] = await Promise.allSettled([
        historicoService.listarPorPaciente(paciente.id),
        examService.listByPatient(paciente.id, 0, 50),
        examService.getEvolution(paciente.id),
      ]);

      if (consultasRes.status === 'fulfilled') {
        setConsultas(consultasRes.value || []);
      } else {
        console.warn('Erro ao buscar consultas do paciente:', consultasRes.reason);
      }

      if (examesRes.status === 'fulfilled') {
        setExames(examesRes.value.content || []);
      } else {
        console.warn('Erro ao buscar exames do paciente:', examesRes.reason);
      }

      if (evolutionRes.status === 'fulfilled') {
        setEvolutionSeries(evolutionRes.value || []);
      } else {
        console.warn('Erro ao buscar evolução do paciente:', evolutionRes.reason);
      }
    } catch (err: any) {
      console.error('Erro geral ao carregar prontuário:', err);
      toast.error('Erro ao carregar dados clínicos do prontuário.');
    } finally {
      setLoading(false);
    }
  }, [paciente.id]);

  useEffect(() => {
    carregarDadosDoProntuario();
  }, [carregarDadosDoProntuario]);

  // Abre detalhes completos de um exame
  const handleAbrirDetalhesExame = async (examId: number) => {
    setLoadingInspect(true);
    try {
      const detail = await examService.getById(examId);
      setInspectingExam(detail);
    } catch (err: any) {
      toast.error('Não foi possível carregar os dados deste exame.');
    } finally {
      setLoadingInspect(false);
    }
  };

  // Abre análise assistida do Gemini
  const handleAbrirAnaliseIa = async (examId: number) => {
    setLoadingInspect(true);
    try {
      const analysis = await examService.getLatestAnalysis(examId);
      if (analysis) {
        setInspectingAnalysis(analysis);
      } else {
        toast.info('Nenhuma análise assistida com IA foi gerada para este exame ainda.');
      }
    } catch (err: any) {
      toast.error('Erro ao recuperar análise por IA.');
    } finally {
      setLoadingInspect(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const [year, month, day] = dateString.split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
      const d = new Date(dateString);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const ultimaConsulta = consultas.length > 0 ? consultas[0] : null;
  const ultimoExame = exames.length > 0 ? exames[0] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra Superior de Identificação e Navegação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onVoltar}
            className="h-9 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à Busca
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Prontuário Individual do Paciente
              </h1>
              <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                ID #{paciente.id}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Linha do tempo clínica, prescrições de dosagem, exames laboratoriais e inteligência clínica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosDoProntuario}
            disabled={loading}
            className="h-9 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {onNovoAtendimento && (
            <Button
              size="sm"
              onClick={() => onNovoAtendimento(paciente)}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <Stethoscope className="w-4 h-4" />
              Novo Atendimento
            </Button>
          )}
        </div>
      </div>

      {/* Cartão de Identificação Rápida do Paciente */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
                {paciente.nome
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {paciente.nome}
                  </h2>
                  <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-700 font-mono">
                    {paciente.cpf}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <strong>{paciente.idade}</strong> anos
                  </span>
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-blue-500" />
                    <strong>{paciente.peso}</strong> kg
                  </span>
                  {paciente.tipoDocumento && (
                    <span className="flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5 text-blue-500" />
                      {paciente.tipoDocumento}
                    </span>
                  )}
                  {paciente.paisOrigem && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      {paciente.paisOrigem}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
              <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Cadastro Ativo
              </Badge>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {consultas.length} consulta(s) • {exames.length} laudo(s)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas Principais do Prontuário */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex flex-wrap gap-1">
          <TabsTrigger value="visao-geral" className="rounded-lg text-xs font-semibold gap-1.5">
            <Activity className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="consultas" className="rounded-lg text-xs font-semibold gap-1.5">
            <Pill className="w-4 h-4" />
            Consultas & Prescrições ({consultas.length})
          </TabsTrigger>
          <TabsTrigger value="exames" className="rounded-lg text-xs font-semibold gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            Exames Laboratoriais ({exames.length})
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="rounded-lg text-xs font-semibold gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Evolução dos Analitos ({evolutionSeries.length})
          </TabsTrigger>
          <TabsTrigger value="cadastrais" className="rounded-lg text-xs font-semibold gap-1.5">
            <User className="w-4 h-4" />
            Dados Cadastrais
          </TabsTrigger>
        </TabsList>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ABA 1: VISÃO GERAL                                            */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Consultas Realizadas</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {consultas.length}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {ultimaConsulta ? `Última em ${formatDateOnly(ultimaConsulta.data)}` : 'Nenhuma consulta'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Laudos de Exames</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {exames.length}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {ultimoExame?.collectionDate
                      ? `Coleta recente: ${formatDateOnly(ultimoExame.collectionDate)}`
                      : 'Sem laudos'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Analitos Comparáveis</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {evolutionSeries.length}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {evolutionSeries.filter((s) => s.points.length >= 2).length} com série histórica (&ge;2)
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Segurança e Rastreabilidade</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    LGPD & Diretrizes
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    SBD 2024 • SBC 2023
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Última Consulta & Último Exame em Cards Lado a Lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resumo da Última Consulta */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Última Prescrição de Medicamento
                    </CardTitle>
                  </div>
                  {ultimaConsulta && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatDate(ultimaConsulta.data)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {ultimaConsulta ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                          {ultimaConsulta.medicamento}
                        </p>
                        <p className="text-xs text-slate-500">
                          Profissional: <strong>{ultimaConsulta.profissional}</strong> (
                          {ultimaConsulta.tipoProfissional === 'medico' ? 'Médico' : 'Enfermeiro'})
                        </p>
                      </div>
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                        {ultimaConsulta.resultado}
                      </Badge>
                    </div>

                    {ultimaConsulta.observacoes && (
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                        {ultimaConsulta.observacoes}
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReabrirConsulta(ultimaConsulta)}
                        className="text-xs text-blue-600 hover:text-blue-800 gap-1 h-8"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Reabrir na Calculadora
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    Nenhuma consulta registrada para este paciente ainda.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Resumo do Último Exame Laboratorial */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Último Laudo Laboratorial
                    </CardTitle>
                  </div>
                  {ultimoExame && (
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                      {ultimoExame.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {ultimoExame ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {ultimoExame.originalFilename}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        {ultimoExame.laboratory && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {ultimoExame.laboratory}
                          </span>
                        )}
                        {ultimoExame.collectionDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Coleta: {formatDateOnly(ultimoExame.collectionDate)}
                          </span>
                        )}
                        <span>{ultimoExame.resultCount} analito(s)</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAbrirAnaliseIa(ultimoExame.id)}
                        className="text-xs gap-1.5 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Ver Análise IA
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleAbrirDetalhesExame(ultimoExame.id)}
                        className="text-xs gap-1 h-8 bg-blue-600 text-white"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Resultados
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    Nenhum exame laboratorial enviado para este paciente.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolução Embutido na Visão Geral */}
          {evolutionSeries.length > 0 && (
            <ExamEvolutionChart
              patientId={paciente.id}
              initialSeries={evolutionSeries}
              onSelectExam={handleAbrirDetalhesExame}
            />
          )}
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ABA 2: CONSULTAS & PRESCRIÇÕES                                */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="consultas" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-600" />
                    Histórico Cronológico de Consultas e Cálculos de Medicamentos
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Registro de todas as administrações calculadas para {paciente.nome}
                  </CardDescription>
                </div>
                <Badge variant="outline">{consultas.length} registro(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-xs font-semibold">Data / Hora</TableHead>
                      <TableHead className="text-xs font-semibold">Profissional Responsável</TableHead>
                      <TableHead className="text-xs font-semibold">Medicamento Prescrito</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Resultado do Cálculo</TableHead>
                      <TableHead className="text-xs font-semibold">Observações / Prescrição</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-500">
                          Nenhuma consulta encontrada para este paciente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      consultas.map((c) => (
                        <TableRow
                          key={c.id}
                          className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(c.data)}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span>{c.profissional}</span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-slate-200 dark:border-slate-700"
                              >
                                {c.tipoProfissional === 'medico' ? 'Médico' : 'Enfermeiro'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {c.medicamento}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-mono text-xs">
                              {c.resultado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                            {c.observacoes || 'Sem notas registradas'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReabrirConsulta(c)}
                              className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Reabrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ABA 3: EXAMES LABORATORIAIS                                   */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="exames" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Laudos Laboratoriais Vinculados ao Paciente
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Histórico de arquivos PDF processados com extração determinística e suporte a decisão clínica
                  </CardDescription>
                </div>
                <Badge variant="outline">{exames.length} exame(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-xs font-semibold">Arquivo / Laudo</TableHead>
                      <TableHead className="text-xs font-semibold">Data da Coleta</TableHead>
                      <TableHead className="text-xs font-semibold">Laboratório Emissor</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Analitos Identificados</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exames.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-500">
                          Nenhum exame laboratorial encontrado para este paciente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      exames.map((e) => (
                        <TableRow
                          key={e.id}
                          className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate max-w-xs">{e.originalFilename}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDateOnly(e.collectionDate)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {e.laboratory || 'Não especificado'}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold text-slate-800 dark:text-slate-200">
                            {e.resultCount}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                e.status === 'PROCESSED' || e.status === 'ANALYZED'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }
                            >
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAbrirAnaliseIa(e.id)}
                                className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300 gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                IA
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAbrirDetalhesExame(e.id)}
                                className="h-7 text-xs bg-blue-600 text-white gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                Laudo
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ABA 4: EVOLUÇÃO DOS ANALITOS                                 */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="evolucao" className="space-y-4">
          <ExamEvolutionChart
            patientId={paciente.id}
            initialSeries={evolutionSeries}
            onSelectExam={handleAbrirDetalhesExame}
          />
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ABA 5: DADOS CADASTRAIS                                      */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="cadastrais" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Dados Cadastrais Oficiais do Paciente
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Informações de registro persistidas no banco de dados do Dose Certa
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Nome Completo</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{paciente.nome}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Documento de Identificação (CPF / Passaporte)</p>
                  <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">{paciente.cpf}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Tipo de Documento</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {paciente.tipoDocumento || 'CPF (Padrão Nacional)'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Idade Registrada</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{paciente.idade} anos</p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Peso Corporal (Base de Cálculo)</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{paciente.peso} kg</p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">País de Origem</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {paciente.paisOrigem || 'Brasil'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: INSPEÇÃO DE LAUDO / RESULTADOS DO EXAME               */}
      {/* ──────────────────────────────────────────────────────────── */}
      {inspectingExam && (
        <Dialog open={!!inspectingExam} onOpenChange={() => setInspectingExam(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Detalhamento do Laudo</span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {inspectingExam.exam.originalFilename}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {inspectingExam.exam.laboratory || 'Laboratório do laudo'} • Coleta:{' '}
                {formatDateOnly(inspectingExam.exam.collectionDate)} • {inspectingExam.results.length} analitos
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              <ExamResultsTable results={inspectingExam.results} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: INSPEÇÃO DA ANÁLISE CLÍNICA ASSISTIDA (GEMINI)        */}
      {/* ──────────────────────────────────────────────────────────── */}
      {inspectingAnalysis && (
        <Dialog open={!!inspectingAnalysis} onOpenChange={() => setInspectingAnalysis(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Inteligência Clínica Assistida
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Interpretação e Achados Clínicos
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Modelo: {inspectingAnalysis.modelId} • Gerado em: {formatDate(inspectingAnalysis.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              <ExamAnalysisFindings analysis={inspectingAnalysis} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
