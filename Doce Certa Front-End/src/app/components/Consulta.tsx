import { useState } from 'react';
import { Calculator, FileText, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

interface ConsultaProps {
  pacientes: any[];
  medicos: any[];
  enfermeiros: any[];
  medicamentos: any[];
  onSaveConsulta: (consulta: any) => void;
}

type TipoCalculo = 'dose' | 'volume' | 'gotas';

export default function Consulta({ 
  pacientes, 
  medicos, 
  enfermeiros, 
  medicamentos,
  onSaveConsulta 
}: ConsultaProps) {
  const [tipoProfissional, setTipoProfissional] = useState<'medico' | 'enfermeiro'>('medico');
  const [profissionalId, setProfissionalId] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [medicamentoId, setMedicamentoId] = useState('');
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>('dose');
  const [resultado, setResultado] = useState<any>(null);
  
  // Estados para prescrição editável
  const [prescricao, setPrescricao] = useState('');

  const profissionais = tipoProfissional === 'medico' ? medicos : enfermeiros;
  const pacienteSelecionado = pacientes.find(p => p.id.toString() === pacienteId);
  const medicamentoSelecionado = medicamentos.find(m => m.id.toString() === medicamentoId);
  const profissionalSelecionado = profissionais.find(p => p.id.toString() === profissionalId);

  const calcularDose = () => {
    if (!pacienteSelecionado || !medicamentoSelecionado) {
      return;
    }

    // Usar dosagem do medicamento
    const dose = parseFloat(medicamentoSelecionado.dosePorKg || '0');
    const peso = pacienteSelecionado.peso;
    
    let calculoFinal = 0;
    let unidade = '';
    let formula = '';
    
    switch (tipoCalculo) {
      case 'dose':
        // Dose (mg/kg)
        calculoFinal = dose * peso;
        unidade = 'mg';
        formula = `Dose = Dosagem × Peso = ${dose} mg/kg × ${peso} kg = ${calculoFinal.toFixed(2)} mg`;
        break;
      case 'volume':
        // Volume (mL/h)
        calculoFinal = dose * peso;
        unidade = 'mL/h';
        formula = `Volume = Dosagem × Peso = ${dose} mL/kg/h × ${peso} kg = ${calculoFinal.toFixed(2)} mL/h`;
        break;
      case 'gotas':
        // Gotas por minuto
        // Fórmula: (Volume × Fator) / Tempo
        const volume = parseFloat(medicamentoSelecionado.volumeMl || '10');
        const fator = parseFloat(medicamentoSelecionado.fatorGotas || '15');
        const tempo = parseFloat(medicamentoSelecionado.tempoMin || '60');
        calculoFinal = (volume * fator) / tempo;
        unidade = 'gotas/min';
        formula = `Gotas/min = (Volume × Fator) / Tempo = (${volume} mL × ${fator} gotas/mL) / ${tempo} min = ${calculoFinal.toFixed(2)} gotas/min`;
        break;
    }

    setResultado({
      valor: calculoFinal.toFixed(2),
      unidade,
      formula,
      paciente: pacienteSelecionado.nome,
      medicamento: medicamentoSelecionado.nome,
      peso: peso,
      dosagem: dose
    });

    // Gerar prescrição automática
    const prescricaoTexto = `PRESCRIÇÃO MÉDICA

Paciente: ${pacienteSelecionado.nome}
CPF: ${pacienteSelecionado.cpf}
Peso: ${pacienteSelecionado.peso} kg
Idade: ${pacienteSelecionado.idade} anos

Medicamento: ${medicamentoSelecionado.nome} (${medicamentoSelecionado.marca})
Dose Calculada: ${calculoFinal.toFixed(2)} ${unidade}
Intervalo: ${medicamentoSelecionado.intervalo}

OBSERVAÇÕES:
Dose diária calculada: ${dose} mg/kg
${medicamentoSelecionado.notas || ''}

_______________________________________________
Assinatura do Profissional
${profissionalSelecionado?.nome || ''}
${tipoProfissional === 'medico' ? `CRM: ${profissionalSelecionado?.crm}` : `COREN: ${profissionalSelecionado?.coren}`} - ${profissionalSelecionado?.estado || ''}

Data: ${new Date().toLocaleDateString('pt-BR')}`;

    setPrescricao(prescricaoTexto);
  };

  const handleGerarCalculo = () => {
    calcularDose();
  };

  const handleSalvar = () => {
    if (!resultado) return;

    onSaveConsulta({
      data: new Date().toISOString(),
      paciente: pacienteSelecionado.nome,
      profissional: profissionalSelecionado?.nome || '',
      tipoProfissional,
      medicamento: medicamentoSelecionado.nome,
      resultado: `${resultado.valor} ${resultado.unidade}`,
      observacoes: prescricao
    });

    // Limpar formulário
    setProfissionalId('');
    setPacienteId('');
    setMedicamentoId('');
    setResultado(null);
    setPrescricao('');
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Dados */}
      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Dados da Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Profissional */}
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={tipoProfissional} onValueChange={(v: any) => {
                setTipoProfissional(v);
                setProfissionalId('');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="enfermeiro">Enfermeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Médico/Enfermeiro */}
            <div className="space-y-2">
              <Label>{tipoProfissional === 'medico' ? 'Médico' : 'Enfermeiro'}</Label>
              <Select value={profissionalId} onValueChange={setProfissionalId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione o ${tipoProfissional}`} />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nome} ({tipoProfissional === 'medico' ? `CRM: ${p.crm}` : `COREN: ${p.coren}`} - {p.estado})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paciente */}
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nome} (CPF: {p.cpf.substring(0, 11)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medicamento */}
            <div className="space-y-2">
              <Label>Medicamento</Label>
              <Select value={medicamentoId} onValueChange={setMedicamentoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o medicamento" />
                </SelectTrigger>
                <SelectContent>
                  {medicamentos.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.nome} ({m.marca})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Cálculo */}
            <div className="space-y-2">
              <Label>Tipo de Cálculo</Label>
              <Select value={tipoCalculo} onValueChange={(v: TipoCalculo) => setTipoCalculo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dose">Dose (mg/kg)</SelectItem>
                  <SelectItem value="volume">Volume (mL/h)</SelectItem>
                  <SelectItem value="gotas">Gotas por minuto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atualizar Listas Button */}
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Atualizar Listas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo de Dosagem */}
      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle>Cálculo de Dosagem</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 min-h-[250px]">
            {resultado ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Medicamento: {resultado.medicamento}</p>
                  <p className="text-sm text-gray-600">Tipo de Cálculo: {
                    tipoCalculo === 'dose' ? 'Dose (mg/kg)' : 
                    tipoCalculo === 'volume' ? 'Volume (mL/h)' : 
                    'Gotas por minuto'
                  }</p>
                  <p className="text-sm text-gray-600">Dosagem do Medicamento: {resultado.dosagem} {
                    tipoCalculo === 'dose' ? 'mg/kg' : 
                    tipoCalculo === 'volume' ? 'mL/kg/h' : 
                    'gotas/min'
                  }</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm mb-2">Fórmula:</p>
                  <p className="bg-gray-50 p-3 rounded">{resultado.formula}</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Cálculo:</p>
                  <p className="text-lg">{resultado.formula}</p>
                </div>

                <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">RESULTADO FINAL:</p>
                  <p className="text-2xl text-blue-600">{resultado.valor} {resultado.unidade}</p>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Intervalo: {medicamentoSelecionado?.intervalo || '-'}</p>
                  <p>Dose Máxima: {medicamentoSelecionado?.doseMaxima || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Preencha os campos acima e clique em "Gerar Cálculo"</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button 
              onClick={handleGerarCalculo}
              disabled={!pacienteId || !medicamentoId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Gerar Cálculo
            </Button>
            <Button 
              onClick={handleSalvar}
              disabled={!resultado}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Consulta
            </Button>
            <Button 
              variant="outline"
              disabled={!resultado}
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar Receita
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prescrição */}
      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle>Prescrição</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <Textarea
            value={prescricao}
            onChange={(e) => setPrescricao(e.target.value)}
            placeholder="A prescrição será gerada automaticamente após o cálculo..."
            rows={15}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
