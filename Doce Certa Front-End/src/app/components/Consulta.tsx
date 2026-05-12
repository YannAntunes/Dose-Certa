import { useState, useEffect } from 'react';
import { Calculator, FileText, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ConsultaProps {
  pacientes: any[];
  medicos: any[];
  enfermeiros: any[];
  medicamentos: any[];
  onSaveConsulta: (consulta: any) => void;
  /** Dados de um atendimento anterior (vindo do Histórico) */
  initialData?: {
    paciente: string;
    profissional: string;
    tipoProfissional: string;
    medicamento: string;
    resultado: string;
    observacoes?: string;
  } | null;
}

type TipoCalculo = 'dose' | 'volume' | 'gotas';

export default function Consulta({
  pacientes,
  medicos,
  enfermeiros,
  medicamentos,
  onSaveConsulta,
  initialData,
}: ConsultaProps) {
  const [tipoProfissional, setTipoProfissional] = useState<'medico' | 'enfermeiro'>('medico');
  const [profissionalId, setProfissionalId] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [medicamentoId, setMedicamentoId] = useState('');
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>('dose');
  const [resultado, setResultado] = useState<any>(null);
  const [prescricao, setPrescricao] = useState('');
  const [jaFoiSalva, setJaFoiSalva] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Preencher campos quando `initialData` é fornecido pelo Histórico
  useEffect(() => {
    if (!initialData) return;

    // Mapear tipo profissional
    const tipo = initialData.tipoProfissional === 'medico' ? 'medico' : 'enfermeiro';
    setTipoProfissional(tipo);

    // Encontrar IDs pelo nome
    const profList = tipo === 'medico' ? medicos : enfermeiros;
    const prof = profList.find(p => p.nome === initialData.profissional);
    if (prof) setProfissionalId(prof.id.toString());

    const pac = pacientes.find(p => p.nome === initialData.paciente);
    if (pac) setPacienteId(pac.id.toString());

    const med = medicamentos.find(m => m.nome === initialData.medicamento);
    if (med) setMedicamentoId(med.id.toString());

    // Mostrar prescrição anterior
    if (initialData.observacoes) {
      setPrescricao(initialData.observacoes);
    }

    toast.info('Dados do atendimento carregados. Clique em "Gerar Cálculo" para recalcular.');
  }, [initialData]);

  const profissionais = tipoProfissional === 'medico' ? medicos : enfermeiros;
  const pacienteSelecionado = pacientes.find(p => p.id.toString() === pacienteId);
  const medicamentoSelecionado = medicamentos.find(m => m.id.toString() === medicamentoId);
  const profissionalSelecionado = profissionais.find(p => p.id.toString() === profissionalId);

  const calcularDose = () => {
    if (!pacienteSelecionado || !medicamentoSelecionado) return;

    const dose = parseFloat(medicamentoSelecionado.dosePorKg || '0');
    const peso = pacienteSelecionado.peso;
    let calculoFinal = 0;
    let unidade = '';
    let formula = '';

    switch (tipoCalculo) {
      case 'dose':
        calculoFinal = dose * peso;
        unidade = 'mg';
        formula = `Dose = Dosagem × Peso = ${dose} mg/kg × ${peso} kg = ${calculoFinal.toFixed(2)} mg`;
        break;
      case 'volume':
        calculoFinal = dose * peso;
        unidade = 'mL/h';
        formula = `Volume = Dosagem × Peso = ${dose} mL/kg/h × ${peso} kg = ${calculoFinal.toFixed(2)} mL/h`;
        break;
      case 'gotas': {
        const volume = parseFloat(medicamentoSelecionado.volumeMl || '10');
        const fator = parseFloat(medicamentoSelecionado.fatorGotas || '15');
        const tempo = parseFloat(medicamentoSelecionado.tempoMin || '60');
        calculoFinal = (volume * fator) / tempo;
        unidade = 'gotas/min';
        formula = `Gotas/min = (Volume × Fator) / Tempo = (${volume} mL × ${fator} gotas/mL) / ${tempo} min = ${calculoFinal.toFixed(2)} gotas/min`;
        break;
      }
    }

    setResultado({
      valor: calculoFinal.toFixed(2),
      unidade,
      formula,
      paciente: pacienteSelecionado.nome,
      medicamento: medicamentoSelecionado.nome,
      peso,
      dosagem: dose,
    });
    // Qualquer recalculo reabilita o salvar
    setJaFoiSalva(false);

    const nomeMed = medicamentoSelecionado.nome || '-';
    const marcaMed = medicamentoSelecionado.marca && medicamentoSelecionado.marca !== 'undefined'
      ? medicamentoSelecionado.marca
      : '';
    const notasMed = medicamentoSelecionado.notas && medicamentoSelecionado.notas !== 'undefined'
      ? medicamentoSelecionado.notas
      : '';

    const prescricaoTexto = `PRESCRIÇÃO MÉDICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PACIENTE
Nome: ${pacienteSelecionado.nome}
CPF: ${pacienteSelecionado.cpf}
Peso: ${pacienteSelecionado.peso} kg
Idade: ${pacienteSelecionado.idade} anos

MEDICAMENTO
Nome: ${nomeMed}${marcaMed ? ` (${marcaMed})` : ''}
Dose Calculada: ${calculoFinal.toFixed(2)} ${unidade}
Intervalo: ${medicamentoSelecionado.intervalo || '-'}

CÁLCULO
Fórmula: ${formula}
Dose diária (mg/kg): ${dose}
${notasMed ? `\nOBSERVAÇÕES:\n${notasMed}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Profissional Responsável: ${profissionalSelecionado?.nome || '-'}
${tipoProfissional === 'medico'
  ? `CRM: ${profissionalSelecionado?.crm || '-'}`
  : `COREN: ${profissionalSelecionado?.coren || '-'}`} - ${profissionalSelecionado?.estado || ''}

Data: ${new Date().toLocaleDateString('pt-BR')}  Hora: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    setPrescricao(prescricaoTexto);
  };

  // ─── Salvar no histórico via API ────────────────────────────────────────────
  const handleSalvar = async () => {
    if (!resultado) {
      toast.warning('Gere o cálculo antes de salvar.');
      return;
    }
    if (jaFoiSalva) {
      toast.info('ℹ️ Esta consulta já foi salva. Modifique algum dado e recalcule para salvar novamente.');
      return;
    }

    setSalvando(true);
    try {
      await onSaveConsulta({
        pacienteId: Number(pacienteId),
        medicamentoId: Number(medicamentoId),
        profissionalId: Number(profissionalId),
        tipoProfissional,
        tipoCalculo,
        observacoes: prescricao,
      });
      setJaFoiSalva(true);
      toast.success('✅ Atendimento salvo no histórico com sucesso!');
    } catch {
      toast.error('Erro ao salvar consulta. Verifique a conexão com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  // ─── Limpar todos os campos ────────────────────────────────────────────────
  const handleLimpar = () => {
    setTipoProfissional('medico');
    setProfissionalId('');
    setPacienteId('');
    setMedicamentoId('');
    setTipoCalculo('dose');
    setResultado(null);
    setPrescricao('');
    setJaFoiSalva(false);
    toast.info('Campos limpos.');
  };


  // ─── Exportar PDF Receituário (Interno) ──────────────────────────────────────────────────────────
  const handleExportarReceituario = () => {
    if (!prescricao) {
      toast.warning('Gere o cálculo primeiro para exportar a receita.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;

    // Cabeçalho Interno
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Dose Certa - Uso Interno', margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sistema de Dosagem de Medicamentos', margin, 20);
    doc.setFontSize(10);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 20, { align: 'right' });

    // Conteúdo da prescrição
    doc.setTextColor(30, 30, 30);
    doc.setFont('courier', 'normal');
    doc.setFontSize(9.5);

    const lines = doc.splitTextToSize(prescricao, usableWidth);
    let y = 40;
    const lineHeight = 5.5;
    const pageHeight = doc.internal.pageSize.getHeight();

    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    const nomePaciente = pacienteSelecionado?.nome?.replace(/\s+/g, '_') || 'paciente';
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    doc.save(`receituario_interno_${nomePaciente}_${dataHoje}.pdf`);
    toast.success('Receituário Interno gerado com sucesso!');
  };

  // ─── Exportar PDF Receita Digital (Paciente) ──────────────────────────────────────────────────────────
  const handleExportarReceitaDigital = () => {
    if (!resultado) {
      toast.warning('Gere o cálculo primeiro para exportar a receita digital.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Estilo mais clean e profissional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('RECEITUÁRIO DIGITAL', pageWidth / 2, 30, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 35, pageWidth - margin, 35);

    // Dados do Paciente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Paciente: ${pacienteSelecionado?.nome || ''}`, margin, 50);
    
    // Mostra CPF ou Passaporte (tipoDocumento se existir)
    const docIdentificacao = pacienteSelecionado?.cpf || '';
    doc.text(`Documento: ${docIdentificacao}`, margin, 58);
    doc.text(`Idade: ${pacienteSelecionado?.idade || ''} anos`, margin, 66);

    doc.line(margin, 75, pageWidth - margin, 75);

    // Medicamento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Prescrição:', margin, 90);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const nomeMed = medicamentoSelecionado?.nome || '';
    const marcaMed = medicamentoSelecionado?.marca && medicamentoSelecionado.marca !== 'undefined' ? `(${medicamentoSelecionado.marca})` : '';
    doc.text(`1. ${nomeMed} ${marcaMed}`, margin, 105);

    // Instruções de Uso
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const doseTxt = `Dose diária recomendada: ${resultado.valor} ${resultado.unidade}`;
    const intervaloTxt = medicamentoSelecionado?.intervalo && medicamentoSelecionado.intervalo !== 'undefined' ? `Intervalo: ${medicamentoSelecionado.intervalo}` : '';
    const viaTxt = 'Uso conforme orientação médica.';
    
    doc.text(doseTxt, margin + 5, 115);
    if (intervaloTxt) doc.text(intervaloTxt, margin + 5, 122);
    doc.text(viaTxt, margin + 5, 129);
    
    if (medicamentoSelecionado?.notas && medicamentoSelecionado.notas !== 'undefined') {
      doc.setFont('helvetica', 'italic');
      doc.text(`Obs: ${medicamentoSelecionado.notas}`, margin + 5, 138);
    }

    // Assinatura
    const profNome = profissionalSelecionado?.nome || '';
    const profReg = tipoProfissional === 'medico' 
        ? `CRM: ${profissionalSelecionado?.crm || ''}` 
        : `COREN: ${profissionalSelecionado?.coren || ''}`;
        
    doc.setDrawColor(0, 0, 0);
    doc.line(pageWidth / 2 - 40, 240, pageWidth / 2 + 40, 240);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(profNome, pageWidth / 2, 247, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(profReg, pageWidth / 2, 253, { align: 'center' });

    // Rodapé
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Dose Certa - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 280, { align: 'center' });

    const nomeArquivo = pacienteSelecionado?.nome?.replace(/\s+/g, '_') || 'paciente';
    doc.save(`receita_digital_${nomeArquivo}.pdf`);
    toast.success('Receita Digital gerada com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* ── Seleção de Dados ── */}
      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Dados da Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tipo de profissional */}
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={tipoProfissional} onValueChange={(v: any) => {
                setTipoProfissional(v);
                setProfissionalId('');
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="enfermeiro">Enfermeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Médico / Enfermeiro */}
            <div className="space-y-2">
              <Label>{tipoProfissional === 'medico' ? 'Médico' : 'Enfermeiro'}</Label>
              <Select value={profissionalId} onValueChange={setProfissionalId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione o ${tipoProfissional}`} />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map(p => (
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
                  {pacientes.map(p => (
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
                  {medicamentos.map(m => (
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dose">Dose (mg/kg)</SelectItem>
                  <SelectItem value="volume">Volume (mL/h)</SelectItem>
                  <SelectItem value="gotas">Gotas por minuto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Gerar Cálculo */}
            <div className="flex items-end">
              <Button
                onClick={calcularDose}
                disabled={!pacienteId || !medicamentoId}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Gerar Cálculo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Resultado do Cálculo ── */}
      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle>Resultado do Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 min-h-[220px]">
            {resultado ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <p><span className="font-medium">Medicamento:</span> {resultado.medicamento}</p>
                  <p><span className="font-medium">Tipo de Cálculo:</span> {
                    tipoCalculo === 'dose' ? 'Dose (mg/kg)' :
                    tipoCalculo === 'volume' ? 'Volume (mL/h)' : 'Gotas/min'
                  }</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-1">Fórmula aplicada:</p>
                  <p className="bg-gray-50 p-3 rounded text-sm font-mono">{resultado.formula}</p>
                </div>

                <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-gray-600 font-medium">RESULTADO FINAL:</p>
                  <p className="text-2xl font-bold text-blue-600">{resultado.valor} {resultado.unidade}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <p><span className="font-medium">Intervalo:</span> {medicamentoSelecionado?.intervalo || '-'}</p>
                  <p><span className="font-medium">Dose Máxima:</span> {medicamentoSelecionado?.doseMaxima || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Preencha os campos acima e clique em "Gerar Cálculo"</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Prescrição ── */}
      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Prescrição
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <Textarea
            value={prescricao}
            onChange={e => setPrescricao(e.target.value)}
            placeholder="A prescrição será gerada automaticamente após o cálculo..."
            rows={15}
            className="font-mono text-sm"
          />

          {/* ── Botões abaixo da prescrição ── */}
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <Button
              onClick={handleSalvar}
              disabled={!resultado || salvando}
              className={jaFoiSalva
                ? "bg-gray-400 hover:bg-gray-400 cursor-default"
                : "bg-green-600 hover:bg-green-700"
              }
            >
              <Save className="w-4 h-4 mr-2" />
              {salvando ? 'Salvando...' : jaFoiSalva ? '✓ Consulta Salva' : 'Salvar Consulta'}
            </Button>

            <Button
              onClick={handleExportarReceituario}
              disabled={!prescricao}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <FileText className="w-4 h-4 mr-2" />
              Receituário (Interno)
            </Button>

            <Button
              onClick={handleExportarReceitaDigital}
              disabled={!resultado}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Receita Digital (Paciente)
            </Button>

            <Button
              onClick={handleLimpar}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Campos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
