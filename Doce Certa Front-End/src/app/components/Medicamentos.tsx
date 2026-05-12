import { Pill, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';

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
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* ── Lista lateral ── */}
      <div className="col-span-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5" />
              Medicamentos
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
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    <span>Cadastrar Novo Medicamento</span>
                  </div>
                </button>

                <div className="py-2">
                  <div className="border-t border-gray-300"></div>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredMedicamentos.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    Nenhum medicamento cadastrado
                  </p>
                )}

                {filteredMedicamentos.map((med, index) => (
                  <button
                    key={med.id}
                    onClick={() => handleSelectMedicamento(med)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedMedicamento?.id === med.id && viewMode === 'info'
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{med.nome}</p>
                        <p className={`text-xs ${
                          selectedMedicamento?.id === med.id && viewMode === 'info'
                            ? 'text-blue-100'
                            : 'text-gray-500'
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
          <Card className="h-full">
            <CardHeader className="bg-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle>Informações do Medicamento</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleEditar} variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Nome:</p>
                      <p className="font-medium">{selectedMedicamento.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Marca:</p>
                      <p>{val(selectedMedicamento.marca)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Parâmetros de Dosagem</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dose por kg:</p>
                        <p>{val(selectedMedicamento.dosePorKg)} mg/kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dose máxima:</p>
                        <p>{val(selectedMedicamento.doseMaxima)} mg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Intervalo:</p>
                        <p>{val(selectedMedicamento.intervalo)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Informações Técnicas</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Volume disponível:</p>
                        <p>{val(selectedMedicamento.volumeDisponivel ?? selectedMedicamento.volumeMl)} mL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Fator gotejamento:</p>
                        <p>{val(selectedMedicamento.fatorGotejamento ?? selectedMedicamento.fatorGotas)} gotas/mL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tempo:</p>
                        <p>{val(selectedMedicamento.tempoMinutos ?? selectedMedicamento.tempoMin)} min</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Notas</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedMedicamento.notas || 'Sem observações'}
                      </p>
                    </div>
                  </div>

                  {/* Botão de excluir com confirmação */}
                  <div className="pt-2">
                    {deletingId === selectedMedicamento.id ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                        <p className="text-sm text-red-700 font-medium">
                          Excluir <strong>{selectedMedicamento.nome}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleConfirmarExcluir}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Confirmar Exclusão
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setDeletingId(null)}
                            className="flex-1"
                          >
                            Cancelar
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
                        Excluir Medicamento
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          /* ── Formulário de Cadastro / Edição ── */
          <Card className="h-full">
            <CardHeader className="bg-gray-100">
              <CardTitle>{isEditing ? 'Editar Medicamento' : 'Cadastro de Medicamento'}</CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do medicamento" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Input id="marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Marca" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dosePorKg">Dose por kg (mg/kg)</Label>
                      <Input id="dosePorKg" type="number" step="0.01" value={dosePorKg} onChange={e => setDosePorKg(e.target.value)} placeholder="Ex: 15.0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intervalo">Intervalo</Label>
                      <Input id="intervalo" value={intervalo} onChange={e => setIntervalo(e.target.value)} placeholder="Ex: 6h" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doseMaxima">Dose Máxima (mg)</Label>
                      <Input id="doseMaxima" type="number" step="0.01" value={doseMaxima} onChange={e => setDoseMaxima(e.target.value)} placeholder="Ex: 2000.0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volumeMl">Volume disponível (mL)</Label>
                      <Input id="volumeMl" type="number" step="0.1" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} placeholder="Ex: 10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fatorGotas">Fator gotejamento (gotas/mL)</Label>
                      <Input id="fatorGotas" type="number" step="1" value={fatorGotas} onChange={e => setFatorGotas(e.target.value)} placeholder="Ex: 15" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tempoMin">Tempo (min)</Label>
                      <Input id="tempoMin" type="number" step="1" value={tempoMin} onChange={e => setTempoMin(e.target.value)} placeholder="Ex: 30" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea id="notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observações sobre o medicamento" rows={4} />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCadastrar} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
                    </Button>
                    <Button onClick={handleLimpar} variant="outline" className="flex-1">
                      Limpar
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsEditing(false);
                      setViewMode('info');
                      if (!selectedMedicamento && medicamentos.length > 0) {
                        setSelectedMedicamento(medicamentos[0]);
                      }
                    }}
                  >
                    Cancelar
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
