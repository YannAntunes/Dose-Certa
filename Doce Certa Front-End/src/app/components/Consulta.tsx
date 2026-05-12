import { useState, useEffect } from 'react';
import { Calculator, FileText, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useLanguage } from '../../contexts/LanguageContext';

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

  const { t } = useLanguage();

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

    toast.info(t('common.status') === 'Status' ? 'Consultation data loaded. Click "Generate Calculation" to recalculate.' : 'Dados do atendimento carregados. Clique em "Gerar Cálculo" para recalcular.');
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
      case 'volume': {
        const doseDisp = parseFloat(medicamentoSelecionado.doseDisponivel || '0');
        const volDisp = parseFloat(medicamentoSelecionado.volumeDisponivel || '0');
        if (doseDisp > 0 && volDisp > 0) {
          const concentracao = doseDisp / volDisp;
          calculoFinal = (dose * peso) / concentracao;
        } else {
          calculoFinal = 0;
        }
        unidade = 'mL/h';
        formula = `Volume = (DoseDiaria) / Concentracao = (${dose * peso} mg) / (${doseDisp}/${volDisp} mg/mL) = ${calculoFinal.toFixed(2)} mL/h`;
        break;
      }
      case 'gotas': {
        const doseDisp = parseFloat(medicamentoSelecionado.doseDisponivel || '0');
        const volDisp = parseFloat(medicamentoSelecionado.volumeDisponivel || '0');
        const fator = parseFloat(medicamentoSelecionado.fatorGotejamento || '0');
        const tempo = parseFloat(medicamentoSelecionado.tempoMinutos || '0');
        
        let volumeMl = 0;
        if (doseDisp > 0 && volDisp > 0) {
          const concentracao = doseDisp / volDisp;
          volumeMl = (dose * peso) / concentracao;
        }

        if (tempo > 0) {
          calculoFinal = (volumeMl * fator) / tempo;
        } else {
          calculoFinal = 0;
        }
        unidade = t('common.status') === 'Status' ? 'drops/min' : 'gotas/min';
        formula = t('common.status') === 'Status' 
          ? `Drops/min = (Volume × Factor) / Time = (${volumeMl.toFixed(2)} mL × ${fator} drops/mL) / ${tempo} min = ${calculoFinal.toFixed(2)} drops/min`
          : `Gotas/min = (Volume × Fator) / Tempo = (${volumeMl.toFixed(2)} mL × ${fator} gotas/mL) / ${tempo} min = ${calculoFinal.toFixed(2)} gotas/min`;
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

    const isEn = t('common.status') === 'Status';
    const prescricaoTexto = `${isEn ? 'MEDICAL PRESCRIPTION' : 'PRESCRIÇÃO MÉDICA'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isEn ? 'PATIENT' : 'PACIENTE'}
${isEn ? 'Name' : 'Nome'}: ${pacienteSelecionado.nome}
${isEn ? 'Document' : 'CPF'}: ${pacienteSelecionado.cpf}
${isEn ? 'Weight' : 'Peso'}: ${pacienteSelecionado.peso} kg
${isEn ? 'Age' : 'Idade'}: ${pacienteSelecionado.idade} ${isEn ? 'years' : 'anos'}

${isEn ? 'MEDICATION' : 'MEDICAMENTO'}
${isEn ? 'Name' : 'Nome'}: ${nomeMed}${marcaMed ? ` (${marcaMed})` : ''}
${isEn ? 'Calculated Dose' : 'Dose Calculada'}: ${calculoFinal.toFixed(2)} ${unidade}
${isEn ? 'Interval' : 'Intervalo'}: ${medicamentoSelecionado.intervalo || '-'}

${isEn ? 'CALCULATION' : 'CÁLCULO'}
${isEn ? 'Formula' : 'Fórmula'}: ${formula}
${isEn ? 'Daily Dose' : 'Dose diária'} (mg/kg): ${dose}
${notasMed ? `\n${isEn ? 'OBSERVATIONS' : 'OBSERVAÇÕES'}:\n${notasMed}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isEn ? 'Responsible Professional' : 'Profissional Responsável'}: ${profissionalSelecionado?.nome || '-'}
${tipoProfissional === 'medico'
  ? `CRM: ${profissionalSelecionado?.crm || '-'}`
  : `COREN: ${profissionalSelecionado?.coren || '-'}`} - ${profissionalSelecionado?.estado || ''}

${isEn ? 'Date' : 'Data'}: ${new Date().toLocaleDateString(isEn ? 'en-US' : 'pt-BR')}  ${isEn ? 'Time' : 'Hora'}: ${new Date().toLocaleTimeString(isEn ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    setPrescricao(prescricaoTexto);
  };

  // ─── Salvar no histórico via API ────────────────────────────────────────────
  const handleSalvar = async () => {
    if (!resultado) {
      toast.warning(t('common.status') === 'Status' ? 'Generate calculation before saving.' : 'Gere o cálculo antes de salvar.');
      return;
    }
    if (jaFoiSalva) {
      toast.info(t('common.status') === 'Status' ? 'ℹ️ This consultation has already been saved. Modify data and recalculate to save again.' : 'ℹ️ Esta consulta já foi salva. Modifique algum dado e recalcule para salvar novamente.');
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
      toast.success(t('common.status') === 'Status' ? '✅ Consultation saved to history successfully!' : '✅ Atendimento salvo no histórico com sucesso!');
    } catch {
      toast.error(t('common.status') === 'Status' ? 'Error saving consultation. Check server connection.' : 'Erro ao salvar consulta. Verifique a conexão com o servidor.');
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
    toast.info(t('common.status') === 'Status' ? 'Fields cleared.' : 'Campos limpos.');
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
    const isEn = t('common.status') === 'Status';
    doc.text(isEn ? `Dose Certa - Internal Use` : 'Dose Certa - Uso Interno', margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(isEn ? 'Medication Dosage System' : 'Sistema de Dosagem de Medicamentos', margin, 20);
    doc.setFontSize(10);
    doc.text(isEn ? `Issued on: ${new Date().toLocaleString('en-US')}` : `Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 20, { align: 'right' });

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
    const dataHoje = new Date().toLocaleDateString(isEn ? 'en-US' : 'pt-BR').replace(/\//g, '-');
    doc.save(`internal_receipt_${nomePaciente}_${dataHoje}.pdf`);
    toast.success(isEn ? 'Internal Receipt generated successfully!' : 'Receituário Interno gerado com sucesso!');
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
    const isEn = t('common.status') === 'Status';
    doc.text(isEn ? 'DIGITAL PRESCRIPTION' : 'RECEITUÁRIO DIGITAL', pageWidth / 2, 30, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 35, pageWidth - margin, 35);

    // Dados do Paciente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${isEn ? 'Patient' : 'Paciente'}: ${pacienteSelecionado?.nome || ''}`, margin, 50);
    
    // Mostra CPF ou Passaporte (tipoDocumento se existir)
    const docIdentificacao = pacienteSelecionado?.cpf || '';
    doc.text(`${isEn ? 'Document' : 'Documento'}: ${docIdentificacao}`, margin, 58);
    doc.text(`${isEn ? 'Age' : 'Idade'}: ${pacienteSelecionado?.idade || ''} ${isEn ? 'years' : 'anos'}`, margin, 66);

    doc.line(margin, 75, pageWidth - margin, 75);

    // Medicamento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${isEn ? 'Prescription' : 'Prescrição'}:`, margin, 90);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const nomeMed = medicamentoSelecionado?.nome || '';
    const marcaMed = medicamentoSelecionado?.marca && medicamentoSelecionado.marca !== 'undefined' ? `(${medicamentoSelecionado.marca})` : '';
    doc.text(`1. ${nomeMed} ${marcaMed}`, margin, 105);

    // Instruções de Uso
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const doseTxt = `${isEn ? 'Recommended daily dose' : 'Dose diária recomendada'}: ${resultado.valor} ${resultado.unidade}`;
    const intervaloTxt = medicamentoSelecionado?.intervalo && medicamentoSelecionado.intervalo !== 'undefined' ? `${isEn ? 'Interval' : 'Intervalo'}: ${medicamentoSelecionado.intervalo}` : '';
    const viaTxt = isEn ? 'Use according to medical guidance.' : 'Uso conforme orientação médica.';
    
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
    doc.text(`Dose Certa - ${new Date().toLocaleDateString(isEn ? 'en-US' : 'pt-BR')} ${new Date().toLocaleTimeString(isEn ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 280, { align: 'center' });

    const nomeArquivo = pacienteSelecionado?.nome?.replace(/\s+/g, '_') || 'paciente';
    doc.save(`digital_prescription_${nomeArquivo}.pdf`);
    toast.success(isEn ? 'Digital Prescription generated successfully!' : 'Receita Digital gerada com sucesso!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Seleção de Dados ── */}
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Calculator className="w-5 h-5 text-blue-500" />
            {t('consulta.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tipo de profissional */}
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-300 font-medium">{t('consulta.prof.label')}</Label>
              <Select value={tipoProfissional} onValueChange={(v: any) => {
                setTipoProfissional(v);
                setProfissionalId('');
              }}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-blue-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">{t('consulta.prof.medico')}</SelectItem>
                  <SelectItem value="enfermeiro">{t('consulta.prof.enfermeiro')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Médico / Enfermeiro */}
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-300 font-medium">{tipoProfissional === 'medico' ? t('consulta.prof.medico') : t('consulta.prof.enfermeiro')}</Label>
              <Select value={profissionalId} onValueChange={setProfissionalId}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-blue-500/50">
                  <SelectValue placeholder={tipoProfissional === 'medico' ? t('consulta.prof.select_medico') : t('consulta.prof.select_enfermeiro')} />
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
              <Label className="text-slate-600 dark:text-slate-300 font-medium">{t('consulta.paciente')}</Label>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-blue-500/50">
                  <SelectValue placeholder={t('consulta.paciente.select')} />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nome} (Doc: {p.cpf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medicamento */}
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-300 font-medium">{t('consulta.med')}</Label>
              <Select value={medicamentoId} onValueChange={setMedicamentoId}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-blue-500/50">
                  <SelectValue placeholder={t('consulta.med.select')} />
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
              <Label className="text-slate-600 dark:text-slate-300 font-medium">{t('consulta.tipo_calc')}</Label>
              <Select value={tipoCalculo} onValueChange={(v: TipoCalculo) => setTipoCalculo(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-blue-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dose">{t('consulta.calc.dose')}</SelectItem>
                  <SelectItem value="volume">{t('consulta.calc.volume')}</SelectItem>
                  <SelectItem value="gotas">{t('consulta.calc.gotas')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Gerar Cálculo */}
            <div className="flex items-end">
              <Button
                onClick={calcularDose}
                disabled={!pacienteId || !medicamentoId || !profissionalId}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all duration-300"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {t('consulta.btn.gerar')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Resultado do Cálculo ── */}
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-slate-800 dark:text-slate-100">{t('consulta.result.title')}</CardTitle>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200/50 dark:border-slate-800 rounded-xl p-6 min-h-[220px] shadow-inner backdrop-blur-md">
            {resultado ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <p><span className="font-semibold text-slate-800 dark:text-slate-200">{t('consulta.result.med')}</span> {resultado.medicamento}</p>
                  <p><span className="font-semibold text-slate-800 dark:text-slate-200">{t('consulta.result.type')}</span> {
                    tipoCalculo === 'dose' ? t('consulta.calc.dose') :
                    tipoCalculo === 'volume' ? t('consulta.calc.volume') : t('consulta.calc.gotas')
                  }</p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <p className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-200">{t('consulta.result.formula')}</p>
                  <p className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">{resultado.formula}</p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl flex items-center justify-between border border-blue-100/50 dark:border-blue-800/30 shadow-sm">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-bold tracking-wide">{t('consulta.result.final')}</p>
                    <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{resultado.valor} <span className="text-xl font-bold text-blue-600/80 dark:text-blue-400/80">{resultado.unidade}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 pt-2">
                  <p><span className="font-semibold text-slate-800 dark:text-slate-200">{t('consulta.result.interval')}</span> {medicamentoSelecionado?.intervalo || '-'}</p>
                  <p><span className="font-semibold text-slate-800 dark:text-slate-200">{t('consulta.result.maxdose')}</span> {medicamentoSelecionado?.doseMaxima || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <div className="text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">{t('consulta.result.empty')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Prescrição ── */}
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FileText className="w-5 h-5 text-indigo-500" />
            {t('consulta.presc.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-6 space-y-4">
          <Textarea
            value={prescricao}
            onChange={e => setPrescricao(e.target.value)}
            placeholder={t('consulta.presc.placeholder')}
            rows={15}
            className="font-mono text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500/50"
          />

          {/* ── Botões abaixo da prescrição ── */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handleSalvar}
              disabled={!resultado || salvando}
              className={jaFoiSalva
                ? "bg-slate-400 hover:bg-slate-400 cursor-default text-white"
                : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
              }
            >
              <Save className="w-4 h-4 mr-2" />
              {salvando ? t('consulta.btn.saving') : jaFoiSalva ? t('consulta.btn.saved') : t('consulta.btn.save')}
            </Button>

            <Button
              onClick={handleExportarReceituario}
              disabled={!jaFoiSalva}
              variant="outline"
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('consulta.btn.pdf_internal')}
            </Button>

            <Button
              onClick={handleExportarReceitaDigital}
              disabled={!jaFoiSalva}
              variant="outline"
              className="border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('consulta.btn.pdf_digital')}
            </Button>

            <Button
              onClick={handleLimpar}
              variant="outline"
              className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('consulta.btn.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
