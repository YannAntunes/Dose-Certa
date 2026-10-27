import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Prontuário Individual, Evolução de Exames & Análise Assistida com IA (Dose Certa)', () => {
  // 1. Pesquisa de pacientes por nome e CPF com desconsideração de pontuação
  test('1. Pesquisa de pacientes: localiza por nome completo, parcial ou dígitos de CPF', () => {
    const pacientes = [
      { id: 1, nome: 'Maria Silva Oliveira', cpf: '123.456.789-00', idade: 52, peso: 68 },
      { id: 2, nome: 'João Pedro Santos', cpf: '987.654.321-11', idade: 45, peso: 82 },
      { id: 3, nome: 'Mariana Costa Ferreira', cpf: '456.789.123-22', idade: 29, peso: 55 },
    ];

    const filtrarPacientes = (lista, termo) => {
      if (!termo || !termo.trim()) return lista;
      const t = termo.trim().toLowerCase();
      const digitos = termo.replace(/\D/g, '');
      return lista.filter((p) => {
        const matchNome = p.nome.toLowerCase().includes(t);
        const matchCpfFormatado = p.cpf.toLowerCase().includes(t);
        const matchCpfDigitos = digitos.length >= 3 && p.cpf.replace(/\D/g, '').includes(digitos);
        return matchNome || matchCpfFormatado || matchCpfDigitos;
      });
    };

    // Busca por nome parcial
    const porNome = filtrarPacientes(pacientes, 'maria');
    assert.equal(porNome.length, 2);
    assert.ok(porNome.some((p) => p.nome === 'Maria Silva Oliveira'));
    assert.ok(porNome.some((p) => p.nome === 'Mariana Costa Ferreira'));

    // Busca por dígitos puros de CPF
    const porDigitos = filtrarPacientes(pacientes, '987654');
    assert.equal(porDigitos.length, 1);
    assert.equal(porDigitos[0].nome, 'João Pedro Santos');

    // Busca inexistente
    const vazia = filtrarPacientes(pacientes, 'Carlos Drummond');
    assert.equal(vazia.length, 0);
  });

  // 2. Isolamento de dados no Prontuário Individual (id persistente)
  test('2. Isolamento do prontuário: associa consultas e exames exclusivamente ao ID do paciente', () => {
    const consultas = [
      { id: 101, pacienteId: 1, medicamento: 'Dipirona', resultado: '15.00 mg/kg' },
      { id: 102, pacienteId: 2, medicamento: 'Paracetamol', resultado: '10.00 mg/kg' },
      { id: 103, pacienteId: 1, medicamento: 'Amoxicilina', resultado: '25.00 mg/kg' },
    ];

    const consultasPaciente1 = consultas.filter((c) => c.pacienteId === 1);
    assert.equal(consultasPaciente1.length, 2);
    assert.ok(consultasPaciente1.every((c) => c.pacienteId === 1));
    assert.ok(!consultasPaciente1.some((c) => c.medicamento === 'Paracetamol'));
  });

  // 3. Diferenciação canônica: Glicose vs Glicemia média estimada (eAG) vs HbA1c
  test('3. Normalização canônica: Glicose, eAG e HbA1c permanecem estritamente separados', () => {
    const normalizar = (texto) => {
      const clean = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (clean.includes('glicemia media estimada') || clean.includes('eag')) {
        return { code: 'ESTIMATED_AVERAGE_GLUCOSE', name: 'Glicemia média estimada' };
      }
      if (clean.includes('hemoglobina glicada') || clean.includes('hba1c')) {
        return { code: 'HBA1C', name: 'Hemoglobina Glicada (HbA1c)' };
      }
      if (clean.includes('glicemia') || clean.includes('glicose')) {
        return { code: 'GLUCOSE', name: 'Glicose' };
      }
      return { code: 'UNKNOWN', name: texto };
    };

    const nGlicose = normalizar('Glicose de Jejum');
    const nEag = normalizar('Glicemia média estimada (eAG)');
    const nHba1c = normalizar('Hemoglobina Glicada - HbA1c');

    assert.equal(nGlicose.code, 'GLUCOSE');
    assert.equal(nEag.code, 'ESTIMATED_AVERAGE_GLUCOSE');
    assert.equal(nHba1c.code, 'HBA1C');
    assert.notEqual(nGlicose.code, nEag.code, 'Glicose e eAG não podem colidir');
    assert.notEqual(nEag.code, nHba1c.code, 'eAG e HbA1c não podem colidir');
  });

  // 4. Regras de deduplicação determinística no laudo
  test('4. Deduplicação no laudo: elimina repetição de cabeçalho na mesma página sem remover histórico', () => {
    const resultados = [
      { testCode: 'GLUCOSE', value: 92, date: '2026-10-27', historical: false, page: 1 },
      { testCode: 'GLUCOSE', value: 92, date: '2026-10-27', historical: false, page: 2 }, // Duplicata intra-laudo
      { testCode: 'GLUCOSE', value: 105, date: '2025-05-15', historical: true, page: 1 }, // Comparação histórica legítima
      { testCode: 'CREATININE', value: 0.9, date: '2026-10-27', historical: false, page: 1 },
    ];

    const deduplicar = (itens) => {
      const vistos = new Set();
      const resultado = [];
      for (const item of itens) {
        // Se for histórico, preserva por data
        const chave = item.historical
          ? `hist:${item.testCode}:${item.date}:${item.value}`
          : `curr:${item.testCode}:${item.value}`;

        if (!vistos.has(chave)) {
          vistos.add(chave);
          resultado.push(item);
        }
      }
      return resultado;
    };

    const deduplicados = deduplicar(resultados);
    assert.equal(deduplicados.length, 3);
    assert.equal(deduplicados.filter((r) => r.testCode === 'GLUCOSE' && !r.historical).length, 1);
    assert.equal(deduplicados.filter((r) => r.testCode === 'GLUCOSE' && r.historical).length, 1);
    assert.equal(deduplicados.filter((r) => r.testCode === 'CREATININE').length, 1);
  });

  // 5. Estruturação dos motivos de "Necessita contexto" (Entender o motivo)
  test('5. Motivo estruturado de contexto: mapeia categorias explicativas detalhadas', () => {
    const motivos = [
      'MISSING_PATIENT_INFORMATION',
      'CONFLICTING_REFERENCE_RANGES',
      'UNIT_AMBIGUITY',
      'METHOD_COMPARABILITY_UNKNOWN',
      'RESULT_REQUIRES_CLINICAL_CORRELATION',
    ];

    const classificarMotivo = (codigo) => {
      switch (codigo) {
        case 'MISSING_PATIENT_INFORMATION':
          return { acao: 'Completar idade/sexo do paciente', risco: 'Falsa classificação por faixa etária/sexo incorreta' };
        case 'CONFLICTING_REFERENCE_RANGES':
          return { acao: 'Verificar metas de risco no laudo', risco: 'Meta clínica variável por perfil de risco' };
        case 'UNIT_AMBIGUITY':
          return { acao: 'Checar unidade no laudo impresso', risco: 'Diferença de escala entre métodos laboratoriais' };
        default:
          return { acao: 'Correlacionar com quadro clínico', risco: 'Interpretação dependente de sintomas e medicamentos' };
      }
    };

    for (const m of motivos) {
      const res = classificarMotivo(m);
      assert.ok(res.acao.length > 5);
      assert.ok(res.risco.length > 5);
    }
  });

  // 6. Contexto clínico pré-análise e minimização rigorosa de dados pessoais (zero PII para Gemini)
  test('6. Proteção de dados (LGPD): contexto pré-análise não envia nome, CPF ou endereço ao modelo', () => {
    const paciente = {
      nome: 'Carlos Eduardo de Souza',
      cpf: '333.444.555-66',
      endereco: 'Rua das Flores 123',
      idade: 64,
      sexo: 'M',
    };

    const contextoClinico = 'Paciente com queixa de tontura e uso de Hidroclorotiazida 25mg';

    const montarPayloadIa = (p, ctx, analitos) => {
      // Regra de ouro da LGPD: Apenas dados clínicos e analíticos
      return {
        pacienteIdade: p.idade,
        pacienteSexo: p.sexo,
        contextoClinico: ctx,
        analitos: analitos,
        // ZERO nome, CPF ou endereço
      };
    };

    const payload = montarPayloadIa(paciente, contextoClinico, [{ analito: 'POTASSIUM', valor: 3.1 }]);

    assert.equal(payload.pacienteIdade, 64);
    assert.equal(payload.pacienteSexo, 'M');
    assert.equal(payload.contextoClinico, contextoClinico);
    assert.equal(payload.nome, undefined);
    assert.equal(payload.cpf, undefined);
    assert.equal(payload.endereco, undefined);
    assert.ok(!JSON.stringify(payload).includes('Carlos Eduardo'));
    assert.ok(!JSON.stringify(payload).includes('333.444.555-66'));
  });

  // 7. Regra de suficiência da série de evolução temporal (>= 2 pontos comparáveis)
  test('7. Evolução temporal: série com 1 ponto informa insuficiência; >= 2 pontos gera curva', () => {
    const avaliarSerie = (pontos) => {
      const comparaveis = pontos.filter((p) => p.valor !== null && !isNaN(p.valor));
      const suficiente = comparaveis.length >= 2;
      return {
        pontos: comparaveis,
        suficiente,
        mensagem: suficiente
          ? 'Curva de evolução temporal gerada com sucesso'
          : 'Necessário pelo menos 2 registros comparáveis para gerar a evolução',
      };
    };

    const serieUnica = avaliarSerie([{ data: '2026-10-27', valor: 85 }]);
    assert.equal(serieUnica.suficiente, false);
    assert.ok(serieUnica.mensagem.includes('pelo menos 2 registros'));

    const serieMultipla = avaliarSerie([
      { data: '2025-06-10', valor: 110 },
      { data: '2026-01-15', valor: 98 },
      { data: '2026-10-27', valor: 89 },
    ]);
    assert.equal(serieMultipla.suficiente, true);
    assert.equal(serieMultipla.pontos.length, 3);
  });
});
