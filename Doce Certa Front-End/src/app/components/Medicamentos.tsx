import { Pill, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { useLanguage } from '../../contexts/LanguageContext';

interface Medicamento {
  id: number;
  nome: string;
  marca?: string;
  dosePorKg?: number | string;
  doseMaxima?: number | string;
  doseDisponivel?: number | string;
  volumeDisponivel?: number | string;
  intervalo?: string;
  notas?: string;
  fatorGotejamento?: number | string;
  tempoMinutos?: number | string;
  tipoPadrao?: string;
  // aliases usados localmente para exibição
  volumeMl?: string;
  tempoMin?: string;
  fatorGotas?: string;
}

interface MedicamentosProps {
  medicamentos: Medicamento[];
  onAddMedicamento?: (medicamento: Omit<Medicamento, 'id'>) => void;
  onUpdateMedicamento?: (id: number, medicamento: Omit<Medicamento, 'id'>) => void;
  onDeleteMedicamento?: (id: number) => void;
}

export default function Medicamentos({
  medicamentos,
  onAddMedicamento,
  onUpdateMedicamento,
  onDeleteMedicamento,
}: MedicamentosProps) {
  const [viewMode, setViewMode] = useState<'info' | 'cadastro'>('info');
  const [isEditing, setIsEditing] = useState(false);
  
  const { t } = useLanguage();

  const [selectedMedicamento, setSelectedMedicamento] = useState<Medicamento | null>(
    medicamentos.length > 0 ? medicamentos[0] : null
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [dosePorKg, setDosePorKg] = useState('');
  const [doseMaxima, setDoseMaxima] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [notas, setNotas] = useState('');
  const [volumeMl, setVolumeMl] = useState('');
  const [tempoMin, setTempoMin] = useState('');
  const [fatorGotas, setFatorGotas] = useState('');

  const handleSelectMedicamento = (med: Medicamento) => {
    setSelectedMedicamento(med);
    setViewMode('info');
    setDeletingId(null);
  };

  const handleNovoCadastro = () => {
    setViewMode('cadastro');
    setSelectedMedicamento(null);
    setIsEditing(false);
    handleLimpar();
  };

  const handleLimpar = () => {
    setNome('');
    setMarca('');
    setDosePorKg('');
    setDoseMaxima('');
    setIntervalo('');
    setNotas('');
    setVolumeMl('');
    setTempoMin('');
    setFatorGotas('');
  };

  const buildPayload = () => ({
    nome,
    marca,
    dosePorKg: dosePorKg ? parseFloat(dosePorKg) : undefined,
    doseMaxima: doseMaxima ? parseFloat(doseMaxima) : undefined,
    doseDisponivel: doseMaxima ? parseFloat(doseMaxima) : undefined,
    volumeDisponivel: volumeMl ? parseFloat(volumeMl) : undefined,
    intervalo,
    notas,
    fatorGotejamento: fatorGotas ? parseFloat(fatorGotas) : undefined,
    tempoMinutos: tempoMin ? parseFloat(tempoMin) : undefined,
  });

  const handleCadastrar = () => {
    if (!nome) return;

    if (isEditing && selectedMedicamento) {
      onUpdateMedicamento?.(selectedMedicamento.id, buildPayload());
    } else {
      onAddMedicamento?.(buildPayload());
    }

    handleLimpar();
    setIsEditing(false);
    setViewMode('info');
  };

  const handleEditar = () => {
    if (!selectedMedicamento) return;
    setNome(selectedMedicamento.nome ?? '');
    setMarca(String(selectedMedicamento.marca ?? ''));
    setDosePorKg(String(selectedMedicamento.dosePorKg ?? ''));
    setDoseMaxima(String(selectedMedicamento.doseMaxima ?? ''));
    setIntervalo(String(selectedMedicamento.intervalo ?? ''));
    setNotas(String(selectedMedicamento.notas ?? ''));
    setVolumeMl(String(
      selectedMedicamento.volumeMl ??
      selectedMedicamento.volumeDisponivel ??
      ''
    ));
    setTempoMin(String(
      selectedMedicamento.tempoMin ??
      selectedMedicamento.tempoMinutos ??
      ''
    ));
    setFatorGotas(String(
      selectedMedicamento.fatorGotas ??
      selectedMedicamento.fatorGotejamento ??
      ''
    ));
    setIsEditing(true);
    setViewMode('cadastro');
  };

  const handleConfirmarExcluir = async () => {
    if (deletingId == null) return;
    await onDeleteMedicamento?.(deletingId);
    // Move seleção para outro item
    const restantes = medicamentos.filter(m => m.id !== deletingId);
    setSelectedMedicamento(restantes.length > 0 ? restantes[0] : null);
    setDeletingId(null);
  };

  /** Helper para exibir valores numéricos sem "undefined" */
  const val = (v: any) => (v != null && v !== '' && v !== 'undefined' ? String(v) : '-');

  const filteredMedicamentos = medicamentos.filter(med => 
    med.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    med.id.toString() === searchTerm
  );

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)] animate-in fade-in duration-500">
      {/* ── Lista lateral ── */}
      <div className="col-span-4">
        <Card className="h-full border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Pill className="w-5 h-5 text-indigo-500" />
              {t('medicamentos.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-1 p-4">
                {/* Botão de novo cadastro */}
                <button
                  onClick={handleNovoCadastro}
                  className={`w-full text-left p-3 rounded-md transition-colors border-2 border-dashed ${
                    viewMode === 'cadastro' && !selectedMedicamento
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    <span>{t('medicamentos.add')}</span>
                  </div>
                </button>

                <div className="py-2">
                  <div className="border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder={t('common.search')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {filteredMedicamentos.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">
                    {t('historico.empty')}
                  </p>
                )}

                {filteredMedicamentos.map((med, index) => (
                  <button
                    key={med.id}
                    onClick={() => handleSelectMedicamento(med)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedMedicamento?.id === med.id && viewMode === 'info'
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{med.nome}</p>
                        <p className={`text-xs ${
                          selectedMedicamento?.id === med.id && viewMode === 'info'
                            ? 'text-indigo-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {med.marca || 'Sem marca'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ── Painel direito ── */}
      <div className="col-span-8">
        {viewMode === 'info' && selectedMedicamento ? (
          /* ── Visualização ── */
          <Card className="h-full border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-800 dark:text-slate-100">Informações do Medicamento</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleEditar} variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                    <Pencil className="w-4 h-4 mr-1" />
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.name')}:</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{selectedMedicamento.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.brand')}:</p>
                      <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.marca)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Parâmetros de Dosagem</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.dose')}:</p>
                        <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.dosePorKg)} mg/kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.max_dose')}:</p>
                        <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.doseMaxima)} mg</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Intervalo:</p>
                        <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.intervalo)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Informações Técnicas</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.vol_disp')}:</p>
                        <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.volumeDisponivel ?? selectedMedicamento.volumeMl)} mL</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.factor')}:</p>
                        <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.fatorGotejamento ?? selectedMedicamento.fatorGotas)} gotas/mL</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('medicamentos.form.time')}:</p>
                        <p className="text-slate-700 dark:text-slate-300">{val(selectedMedicamento.tempoMinutos ?? selectedMedicamento.tempoMin)} min</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('medicamentos.form.notes')}</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedMedicamento.notas || 'Sem observações'}
                      </p>
                    </div>
                  </div>

                  {/* Botão de excluir com confirmação */}
                  <div className="pt-2">
                    {deletingId === selectedMedicamento.id ? (
                      <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4 space-y-3">
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                          {t('common.delete')} <strong>{selectedMedicamento.nome}</strong>?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleConfirmarExcluir}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            {t('common.delete')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setDeletingId(null)}
                            className="flex-1 border-slate-200 dark:border-slate-700 dark:text-slate-300"
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setDeletingId(selectedMedicamento.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          /* ── Formulário de Cadastro / Edição ── */
          <Card className="h-full border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-slate-800 dark:text-slate-100">{isEditing ? t('common.edit') : t('medicamentos.add')}</CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="dark:text-slate-300">{t('medicamentos.form.name')} *</Label>
                      <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder={t('medicamentos.form.name')} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca" className="dark:text-slate-300">{t('medicamentos.form.brand')}</Label>
                      <Input id="marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder={t('medicamentos.form.brand')} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dosePorKg" className="dark:text-slate-300">{t('medicamentos.form.dose')}</Label>
                      <Input id="dosePorKg" type="number" step="0.01" value={dosePorKg} onChange={e => setDosePorKg(e.target.value)} placeholder="Ex: 15.0" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intervalo" className="dark:text-slate-300">{t('medicamentos.form.interval')}</Label>
                      <Input id="intervalo" value={intervalo} onChange={e => setIntervalo(e.target.value)} placeholder="Ex: 6h" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doseMaxima" className="dark:text-slate-300">{t('medicamentos.form.max_dose')}</Label>
                      <Input id="doseMaxima" type="number" step="0.01" value={doseMaxima} onChange={e => setDoseMaxima(e.target.value)} placeholder="Ex: 2000.0" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volumeMl" className="dark:text-slate-300">{t('medicamentos.form.vol_disp')}</Label>
                      <Input id="volumeMl" type="number" step="0.1" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} placeholder="Ex: 10" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fatorGotas" className="dark:text-slate-300">{t('medicamentos.form.factor')}</Label>
                      <Input id="fatorGotas" type="number" step="1" value={fatorGotas} onChange={e => setFatorGotas(e.target.value)} placeholder="Ex: 15" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tempoMin" className="dark:text-slate-300">{t('medicamentos.form.time')}</Label>
                      <Input id="tempoMin" type="number" step="1" value={tempoMin} onChange={e => setTempoMin(e.target.value)} placeholder="Ex: 30" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas" className="dark:text-slate-300">{t('medicamentos.form.notes')}</Label>
                    <Textarea id="notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder={t('medicamentos.form.notes')} rows={4} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCadastrar} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      {isEditing ? t('common.save') : t('medicamentos.add')}
                    </Button>
                    <Button onClick={handleLimpar} variant="outline" className="flex-1 border-slate-200 dark:border-slate-700 dark:text-slate-300">
                      {t('consulta.btn.clear')}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-700 dark:text-slate-300"
                    onClick={() => {
                      setIsEditing(false);
                      setViewMode('info');
                      if (!selectedMedicamento && medicamentos.length > 0) {
                        setSelectedMedicamento(medicamentos[0]);
                      }
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
