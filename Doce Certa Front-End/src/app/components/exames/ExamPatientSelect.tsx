import React, { useState, useMemo } from 'react';
import { User, Check, AlertCircle, Search, X, RefreshCw, UserCheck } from 'lucide-react';
import { Paciente } from '../../../services/api';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface ExamPatientSelectProps {
  pacientes: Paciente[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  selectedSex: 'M' | 'F' | '';
  onSelectSex: (sex: 'M' | 'F') => void;
  disabled?: boolean;
}

export default function ExamPatientSelect({
  pacientes,
  selectedPatientId,
  onSelectPatient,
  selectedSex,
  onSelectSex,
  disabled = false,
}: ExamPatientSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const patient = useMemo(
    () => pacientes.find((p) => String(p.id) === selectedPatientId),
    [pacientes, selectedPatientId]
  );

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return pacientes;
    const term = searchQuery.toLowerCase().trim();
    const cleanTermCpf = term.replace(/\D/g, '');

    return pacientes.filter((p) => {
      const matchName = p.nome?.toLowerCase().includes(term);
      const matchCpf = cleanTermCpf && p.cpf?.replace(/\D/g, '').includes(cleanTermCpf);
      const matchId = String(p.id) === term;
      return matchName || matchCpf || matchId;
    });
  }, [pacientes, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Se já há um paciente selecionado: Card de destaque com botão de trocar paciente */}
      {patient ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Paciente Selecionado para a Análise
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onSelectPatient('');
                setSearchQuery('');
              }}
              className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium text-xs gap-1.5 h-8 shadow-sm"
              title="Voltar para a lista e selecionar outro paciente"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Trocar Paciente / Nova Busca
            </Button>
          </div>

          <Card className="bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-sm animate-in fade-in">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {patient.nome}
                  </span>
                  <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 text-[10px]">
                    Ativo
                  </Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  CPF: <strong className="text-slate-800 dark:text-slate-200">{patient.cpf || 'Não informado'}</strong>
                  {patient.idade !== undefined && ` • Idade: ${patient.idade} anos`}
                  {patient.peso !== undefined && ` • Peso: ${patient.peso} kg`}
                  {patient.paisOrigem && ` • Origem: ${patient.paisOrigem}`}
                </p>
              </div>

              {/* Sexo de referência para analitos laboratoriais */}
              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[11px] text-slate-500 font-medium">Sexo ref:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectSex('M')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                      selectedSex === 'M'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {selectedSex === 'M' && <Check className="w-3 h-3" />}
                    Masc
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectSex('F')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                      selectedSex === 'F'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {selectedSex === 'F' && <Check className="w-3 h-3" />}
                    Fem
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Se nenhum paciente está selecionado: Busca por nome / CPF e listagem rápida */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Selecione o paciente associado ao exame <span className="text-red-500">*</span>
            </Label>
            <span className="text-xs text-slate-500">
              {filteredPatients.length} paciente(s) disponível(is)
            </span>
          </div>

          {/* Campo de pesquisa imediata */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <Input
              type="text"
              placeholder="Digite o nome, CPF ou identificador do paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              className="pl-9 pr-8 h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lista com pacientes filtrados */}
          {filteredPatients.length > 0 ? (
            <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">
                        {p.nome}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        CPF: {p.cpf || 'Não informado'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Idade: {p.idade !== undefined ? `${p.idade} anos` : 'Não informada'}</span>
                      {p.peso !== undefined && <span>• Peso: {p.peso} kg</span>}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      onSelectPatient(String(p.id));
                      setSearchQuery('');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Selecionar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs space-y-1">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Nenhum paciente encontrado para &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-[11px]">
                Verifique a grafia ou cadastre o paciente na aba &ldquo;Pacientes&rdquo; antes de prosseguir.
              </p>
            </div>
          )}

          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            A seleção de um paciente é obrigatória para processar o exame e manter a rastreabilidade do prontuário.
          </p>
        </div>
      )}
    </div>
  );
}
