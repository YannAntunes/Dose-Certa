import { Pill, Plus } from 'lucide-react';
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
  marca: string;
  dosePorKg: string;
  doseMaxima: string;
  intervalo: string;
  notas: string;
  volumeMl: string;
  tempoMin: string;
  fatorGotas: string;
}

interface MedicamentosProps {
  medicamentos: Medicamento[];
  onAddMedicamento?: (medicamento: Omit<Medicamento, 'id'>) => void;
}

export default function Medicamentos({ medicamentos, onAddMedicamento }: MedicamentosProps) {
  const [viewMode, setViewMode] = useState<'info' | 'cadastro'>('info');
  const [selectedMedicamento, setSelectedMedicamento] = useState<Medicamento | null>(
    medicamentos.length > 0 ? medicamentos[0] : null
  );

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
  };

  const handleNovoCadastro = () => {
    setViewMode('cadastro');
    setSelectedMedicamento(null);
  };

  const handleCadastrar = () => {
    if (!nome || !marca) return;

    onAddMedicamento?.({
      nome,
      marca,
      dosePorKg,
      doseMaxima,
      intervalo,
      notas,
      volumeMl,
      tempoMin,
      fatorGotas
    });

    // Limpar formulário
    handleLimpar();
    setViewMode('info');
  };

  const handleEditar = () => {
    if (!selectedMedicamento) return;
    // Preencher formulário com dados do medicamento selecionado
    setNome(selectedMedicamento.nome);
    setMarca(selectedMedicamento.marca);
    setDosePorKg(selectedMedicamento.dosePorKg);
    setDoseMaxima(selectedMedicamento.doseMaxima);
    setIntervalo(selectedMedicamento.intervalo);
    setNotas(selectedMedicamento.notas);
    setVolumeMl(selectedMedicamento.volumeMl);
    setTempoMin(selectedMedicamento.tempoMin);
    setFatorGotas(selectedMedicamento.fatorGotas);
    setViewMode('cadastro');
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

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Lista de Medicamentos */}
      <div className="col-span-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Lista de Medicamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-1 p-4">
                {/* Opção de Cadastro */}
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

                {/* Separador */}
                <div className="py-2">
                  <div className="border-t border-gray-300"></div>
                </div>

                {/* Lista de Medicamentos */}
                {medicamentos.map((med, index) => (
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
                        <p className="truncate">{med.nome}</p>
                        <p className={`text-xs ${
                          selectedMedicamento?.id === med.id && viewMode === 'info' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {med.marca}
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

      {/* Informações do Medicamento OU Cadastro */}
      <div className="col-span-8">
        {viewMode === 'info' && selectedMedicamento ? (
          // Visualização de Informações
          <Card className="h-full">
            <CardHeader className="bg-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle>Informações do Medicamento</CardTitle>
                <Button onClick={handleEditar} variant="outline" size="sm">
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Nome:</p>
                      <p>{selectedMedicamento.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Marca:</p>
                      <p>{selectedMedicamento.marca}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="mb-3">--- Parâmetros de Dosagem ---</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dose por kg:</p>
                        <p>{selectedMedicamento.dosePorKg ? `${selectedMedicamento.dosePorKg} mg/kg` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dose máxima:</p>
                        <p>{selectedMedicamento.doseMaxima ? `${selectedMedicamento.doseMaxima} mg` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Intervalo:</p>
                        <p>{selectedMedicamento.intervalo || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="mb-3">--- Informações Técnicas ---</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Volume:</p>
                        <p>{selectedMedicamento.volumeMl ? `${selectedMedicamento.volumeMl} mL` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Fator:</p>
                        <p>{selectedMedicamento.fatorGotas ? `${selectedMedicamento.fatorGotas} gotas/mL` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tempo:</p>
                        <p>{selectedMedicamento.tempoMin ? `${selectedMedicamento.tempoMin} min` : '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="mb-2">--- Notas ---</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedMedicamento.notas || 'Sem observações'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button variant="destructive" className="w-full">
                      Excluir Medicamento
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          // Formulário de Cadastro
          <Card className="h-full">
            <CardHeader className="bg-gray-100">
              <CardTitle>Cadastro de Medicamento</CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Nome do medicamento"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="Marca"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dosePorKg">Dose Disp. (mg/kg)</Label>
                      <Input
                        id="dosePorKg"
                        value={dosePorKg}
                        onChange={(e) => setDosePorKg(e.target.value)}
                        placeholder="Ex: 15.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intervalo">Intervalo</Label>
                      <Input
                        id="intervalo"
                        value={intervalo}
                        onChange={(e) => setIntervalo(e.target.value)}
                        placeholder="Ex: 6h"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doseMaxima">Dose Máx. (mg)</Label>
                      <Input
                        id="doseMaxima"
                        value={doseMaxima}
                        onChange={(e) => setDoseMaxima(e.target.value)}
                        placeholder="Ex: 2000.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volumeMl">Volume (mL)</Label>
                      <Input
                        id="volumeMl"
                        value={volumeMl}
                        onChange={(e) => setVolumeMl(e.target.value)}
                        placeholder="Ex: 10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fatorGotas">Fator (gotas/mL)</Label>
                      <Input
                        id="fatorGotas"
                        value={fatorGotas}
                        onChange={(e) => setFatorGotas(e.target.value)}
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tempoMin">Tempo (min)</Label>
                      <Input
                        id="tempoMin"
                        value={tempoMin}
                        onChange={(e) => setTempoMin(e.target.value)}
                        placeholder="Ex: 30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Observações sobre o medicamento"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCadastrar}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar
                    </Button>
                    <Button
                      onClick={handleLimpar}
                      variant="outline"
                      className="flex-1"
                    >
                      Limpar
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (medicamentos.length > 0) {
                        setViewMode('info');
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
