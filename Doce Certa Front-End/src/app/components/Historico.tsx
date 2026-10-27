import React, { useState, useEffect, Fragment, useCallback } from 'react';
import {
  Clock,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  User,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Scale,
  Calendar,
  IdCard,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useLanguage } from '../../contexts/LanguageContext';
import { SyncBadge } from './SyncStatusBar';
import type { SyncStatus } from '../../services/offlineDb';
import { Paciente, pacienteService } from '../../services/api';
import ProntuarioPaciente from './prontuario/ProntuarioPaciente';
import { toast } from 'sonner';

interface HistoricoItem {
  _syncStatus?: SyncStatus;
  _syncError?: string;
  id: number;
  data: string;
  pacienteId?: number;
  paciente: string;
  medicamentoId?: number;
  profissional: string;
  tipoProfissional: string;
  medicamento: string;
  resultado: string;
  observacoes?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
}

interface HistoricoProps {
  historico: HistoricoItem[];
  pacientes?: Paciente[];
  /** Callback para reabrir um atendimento na aba Consulta */
  onReabrirConsulta: (item: HistoricoItem) => void;
  onRefresh?: () => void;
  onNovoAtendimento?: (paciente: Paciente) => void;
}

export default function Historico({
  historico,
  pacientes = [],
  onReabrirConsulta,
  onRefresh,
  onNovoAtendimento,
}: HistoricoProps) {
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientList, setPatientList] = useState<Paciente[]>(pacientes);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'prontuarios' | 'consultas-geral'>('prontuarios');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { t, language } = useLanguage();

  // Busca debounced de pacientes no banco
  const buscarPacientes = useCallback(async (termo: string) => {
    setLoadingPatients(true);
    try {
      if (!termo.trim()) {
        const all = await pacienteService.listar();
        setPatientList(all || []);
      } else {
        const matches = await pacienteService.buscar(termo);
        setPatientList(matches || []);
      }
    } catch (err: any) {
      console.error('Erro na pesquisa de pacientes:', err);
      // Fallback em memória se a API falhar
      const q = termo.toLowerCase().trim();
      const filtered = pacientes.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.cpf.includes(q) ||
          (p.tipoDocumento && p.tipoDocumento.toLowerCase().includes(q))
      );
      setPatientList(filtered);
    } finally {
      setLoadingPatients(false);
    }
  }, [pacientes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarPacientes(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, buscarPacientes]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
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

  // Se um paciente foi selecionado, exibe o Prontuário Individual completo
  if (selectedPatient) {
    return (
      <ProntuarioPaciente
        paciente={selectedPatient}
        onVoltar={() => setSelectedPatient(null)}
        onReabrirConsulta={onReabrirConsulta}
        onNovoAtendimento={onNovoAtendimento}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Histórico & Prontuários
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pesquise por nome ou documento para acessar o prontuário eletrônico individual do paciente
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs
            value={activeSubTab}
            onValueChange={(val: any) => setActiveSubTab(val)}
            className="w-auto"
          >
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger
                value="prontuarios"
                className="text-xs font-semibold gap-1.5 rounded-lg"
              >
                <Users className="w-3.5 h-3.5" />
                Prontuários por Paciente
              </TabsTrigger>
              <TabsTrigger
                value="consultas-geral"
                className="text-xs font-semibold gap-1.5 rounded-lg"
              >
                <Clock className="w-3.5 h-3.5" />
                Livro Geral de Consultas ({historico.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeSubTab === 'consultas-geral' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh?.()}
              className="gap-1.5 border-slate-200 dark:border-slate-700 dark:text-slate-300 h-9"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {language === 'pt' ? 'Atualizar' : 'Refresh'}
            </Button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODO 1: PESQUISA E ACESSO A PRONTUÁRIOS INDIVIDUAIS            */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'prontuarios' && (
        <div className="space-y-6">
          {/* Barra de Pesquisa de Pacientes */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Pesquisar paciente por nome, CPF ou documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de Resultados de Pacientes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                {loadingPatients
                  ? 'Buscando pacientes no banco de dados...'
                  : `${patientList.length} paciente(s) encontrado(s)`}
              </span>
              {searchQuery && (
                <span>
                  Filtro: &ldquo;<strong>{searchQuery}</strong>&rdquo;
                </span>
              )}
            </div>

            {loadingPatients ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Carregando registros de pacientes...
              </div>
            ) : patientList.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
                <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Nenhum paciente localizado
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Não foi encontrado nenhum paciente cadastrado correspondente à busca &ldquo;{searchQuery}&rdquo;.
                  Verifique a digitação ou cadastre um novo paciente na aba Pacientes.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patientList.map((p) => {
                  const initials = p.nome
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <Card
                      key={p.id}
                      className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all hover:shadow-md group flex flex-col justify-between"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {p.nome}
                              </h3>
                              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                                {p.cpf}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0 border-slate-200 dark:border-slate-700"
                          >
                            ID #{p.id}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{p.idade} anos</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{p.peso} kg</span>
                          </div>
                          {p.paisOrigem && (
                            <div className="col-span-2 flex items-center gap-1.5 truncate">
                              <IdCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">{p.paisOrigem}</span>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => setSelectedPatient(p)}
                          className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm shadow-indigo-500/20"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Abrir Prontuário
                          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODO 2: LIVRO GERAL DE CONSULTAS (HISTÓRICO LINEAR)            */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'consultas-geral' && (
        <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100 text-base">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  {t('historico.title')}
                </CardTitle>
                <CardDescription className="dark:text-slate-400 text-xs">
                  {t('historico.desc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {language === 'pt' ? 'Data/Hora' : 'Date/Time'}
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {t('consulta.paciente')}
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {language === 'pt' ? 'Profissional' : 'Professional'}
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {t('consulta.med')}
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {language === 'pt' ? 'Resultado' : 'Result'}
                    </TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-10 text-xs">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {t('historico.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    historico.map((item) => (
                      <Fragment key={item.id}>
                        <TableRow
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-200 dark:border-slate-800 ${
                            expandedRow === item.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                          }`}
                        >
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(item.data)}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {item.paciente}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {item.profissional}
                              </span>
                              <Badge
                                variant="outline"
                                className="w-fit text-[10px] px-1 py-0 border-slate-200 dark:border-slate-700 dark:text-slate-400"
                              >
                                {item.tipoProfissional === 'medico'
                                  ? t('consulta.prof.medico')
                                  : t('consulta.prof.enfermeiro')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                            {item.medicamento}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 text-xs font-mono">
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
                                className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 h-8 w-8 p-0"
                              >
                                {expandedRow === item.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>

                              {/* Reabrir na Consulta */}
                              <Button
                                variant="outline"
                                size="sm"
                                title={
                                  language === 'pt'
                                    ? 'Reabrir este atendimento'
                                    : 'Reopen this consultation'
                                }
                                onClick={() => onReabrirConsulta(item)}
                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-indigo-900/30 dark:border-indigo-900 gap-1 h-8 text-xs"
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
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">
                                  {language === 'pt'
                                    ? 'PRESCRIÇÃO / OBSERVAÇÕES'
                                    : 'PRESCRIPTION / NOTES'}
                                </p>
                                {item.observacoes ? (
                                  <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap bg-white/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-64 overflow-y-auto shadow-inner">
                                    {item.observacoes}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">
                                    {language === 'pt'
                                      ? 'Sem observações registradas.'
                                      : 'No notes recorded.'}
                                  </p>
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
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                {language === 'pt' ? 'Total de' : 'Total of'}{' '}
                <strong>{historico.length}</strong>{' '}
                {language === 'pt'
                  ? 'consulta(s) registrada(s)'
                  : 'consultation(s) recorded'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
