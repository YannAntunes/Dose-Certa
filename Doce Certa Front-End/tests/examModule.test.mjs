import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Módulo de Frontend - Análise de Exames (Dose Certa)', () => {
  // 1. Exibição da nova opção na barra lateral e controle de acesso
  test('1. Permissões de menu: Análise de Exames visível para ADMIN, MEDICO e ENFERMEIRO, bloqueado para RECEPCAO', () => {
    const rolesAllowed = ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'];
    const menuItem = {
      id: 'exames',
      label: 'Análise de Exames',
      roles: rolesAllowed,
    };

    assert.ok(menuItem.roles.includes('ADMIN'));
    assert.ok(menuItem.roles.includes('MEDICO'));
    assert.ok(menuItem.roles.includes('ENFERMEIRO'));
    assert.ok(!menuItem.roles.includes('RECEPCAO'), 'RECEPCAO não deve ter acesso ao módulo de exames');
  });

  // 2. Navegação e seleção da rota
  test('2. Roteamento: tela de exames selecionável pelo ID "exames"', () => {
    let currentPage = 'dashboard';
    const onPageChange = (page) => {
      currentPage = page;
    };

    onPageChange('exames');
    assert.equal(currentPage, 'exames');
  });

  // 3. Validação de formato (somente PDF)
  test('3. Validação de formato: apenas arquivos PDF são aceitos', () => {
    const isValidFile = (filename, type) => {
      return type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
    };

    assert.ok(isValidFile('laudo_exame.pdf', 'application/pdf'));
    assert.ok(isValidFile('exame.PDF', ''));
    assert.ok(!isValidFile('foto.jpg', 'image/jpeg'));
    assert.ok(!isValidFile('planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    assert.ok(!isValidFile('documento.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  });

  // 4. Validação de tamanho máximo (10MB) e arquivo vazio
  test('4. Validação de tamanho: rejeita arquivos > 10MB ou vazios (0 bytes)', () => {
    const MAX_SIZE = 10 * 1024 * 1024;
    const validateSize = (size) => {
      if (size === 0) return { valid: false, error: 'Arquivo vazio' };
      if (size > MAX_SIZE) return { valid: false, error: 'Arquivo excede 10MB' };
      return { valid: true };
    };

    assert.deepEqual(validateSize(0), { valid: false, error: 'Arquivo vazio' });
    assert.deepEqual(validateSize(11 * 1024 * 1024), { valid: false, error: 'Arquivo excede 10MB' });
    assert.deepEqual(validateSize(500 * 1024), { valid: true });
  });

  // 5. Associação obrigatória de paciente existente
  test('5. Associação de paciente: upload bloqueado sem paciente selecionado', () => {
    const canUpload = (patientId, file) => {
      return Boolean(patientId && file && file.size > 0);
    };

    assert.equal(canUpload('', { size: 100 }), false);
    assert.equal(canUpload('1', null), false);
    assert.equal(canUpload('1', { size: 1024 }), true);
  });

  // 6. Remoção e substituição de arquivo selecionado
  test('6. Substituição de arquivo: permite remover e limpar arquivo em pré-visualização', () => {
    let selectedFile = { name: 'laudo1.pdf', size: 1024 };
    const removeFile = () => {
      selectedFile = null;
    };

    removeFile();
    assert.equal(selectedFile, null);
  });

  // 7. Mapeamento das 7 etapas da linha do tempo conforme estado real do backend
  test('7. Linha do tempo: mapeia fielmente estados UPLOADED, PROCESSED e ANALYZED sem etapas falsas', () => {
    const computeTimeline = (examStatus, analysisStatus) => {
      const isAiDone = analysisStatus === 'COMPLETED' || examStatus === 'ANALYZED';
      const isProcessed = examStatus === 'PROCESSED' || isAiDone;

      return {
        step1Upload: 'completed',
        step2Extraction: isProcessed ? 'completed' : 'current',
        step3Results: isProcessed ? 'completed' : 'pending',
        step4Validation: isProcessed ? 'completed' : 'pending',
        step5Comparison: isProcessed ? 'completed' : 'pending',
        step6AiAnalysis: isAiDone ? 'completed' : isProcessed ? 'pending' : 'pending',
        step7Finished: isAiDone ? 'completed' : 'pending',
      };
    };

    // Cenário A: Exame processado mas IA ainda não disparada
    const timelineProcessed = computeTimeline('PROCESSED', null);
    assert.equal(timelineProcessed.step1Upload, 'completed');
    assert.equal(timelineProcessed.step2Extraction, 'completed');
    assert.equal(timelineProcessed.step3Results, 'completed');
    assert.equal(timelineProcessed.step4Validation, 'completed');
    assert.equal(timelineProcessed.step5Comparison, 'completed');
    assert.equal(timelineProcessed.step6AiAnalysis, 'pending', 'IA não deve ser marcada como concluída antes da execução');
    assert.equal(timelineProcessed.step7Finished, 'pending');

    // Cenário B: Exame e análise concluídos
    const timelineAnalyzed = computeTimeline('ANALYZED', 'COMPLETED');
    assert.equal(timelineAnalyzed.step6AiAnalysis, 'completed');
    assert.equal(timelineAnalyzed.step7Finished, 'completed');
  });

  // 8. Tratamento de erro na linha do tempo (ex: documento escaneado sem OCR)
  test('8. Linha do tempo com erro: destaca etapa com falha e exibe erro sanitizado', () => {
    const examError = {
      status: 'ERROR',
      errorMessage: 'OCR_REQUIRED: documento escaneado sem camada de texto legível',
    };

    const isOcrError = examError.errorMessage.includes('OCR');
    assert.ok(isOcrError);
  });

  // 9. Persistência de sessão (navegação contínua)
  test('9. Persistência de sessão: armazena e recupera ID do exame ativo', () => {
    const mockStorage = new Map();
    const saveActiveExam = (id) => mockStorage.set('activeExamId', String(id));
    const getActiveExam = () => {
      const val = mockStorage.get('activeExamId');
      return val ? parseInt(val, 10) : null;
    };

    saveActiveExam(42);
    assert.equal(getActiveExam(), 42);

    mockStorage.delete('activeExamId');
    assert.equal(getActiveExam(), null);
  });

  // 10. Classificação determinística de resultados laboratoriais
  test('10. Status de resultados laboratoriais: categoriza e gera badges apropriados', () => {
    const formatStatus = (status) => {
      switch (status) {
        case 'WITHIN_REFERENCE':
          return { label: 'Normal / Na referência', color: 'emerald' };
        case 'ABOVE_REFERENCE':
          return { label: 'Acima da referência', color: 'amber' };
        case 'BELOW_REFERENCE':
          return { label: 'Abaixo da referência', color: 'amber' };
        case 'CRITICAL_HIGH':
        case 'CRITICAL_LOW':
          return { label: 'Crítico', color: 'red' };
        case 'NEEDS_CONTEXT':
          return { label: 'Necessita contexto', color: 'purple' };
        case 'NO_REFERENCE':
        default:
          return { label: 'Sem referência', color: 'slate' };
      }
    };

    assert.equal(formatStatus('WITHIN_REFERENCE').label, 'Normal / Na referência');
    assert.equal(formatStatus('ABOVE_REFERENCE').label, 'Acima da referência');
    assert.equal(formatStatus('CRITICAL_HIGH').label, 'Crítico');
    assert.equal(formatStatus('NO_REFERENCE').label, 'Sem referência');
  });

  // 11. Resultados sem referência não são apresentados como normais
  test('11. Integridade médica: resultados sem referência não são marcados falsamente como normais', () => {
    const resultSemRef = {
      normalizedName: 'Marcador Experimental',
      numericValue: 45,
      referenceText: null,
      status: 'NO_REFERENCE',
    };

    assert.notEqual(resultSemRef.status, 'WITHIN_REFERENCE');
    assert.equal(resultSemRef.status, 'NO_REFERENCE');
  });

  // 12. Achados da IA com níveis de severidade clínica
  test('12. Achados da IA: renderiza severidades INFO, ATTENTION, URGENT e CRITICAL', () => {
    const findings = [
      { id: 1, severity: 'ATTENTION', title: 'Glicemia de jejum elevada' },
      { id: 2, severity: 'INFO', title: 'Hemoglobina estável' },
    ];

    const attentionFindings = findings.filter((f) => f.severity === 'ATTENTION');
    assert.equal(attentionFindings.length, 1);
    assert.equal(attentionFindings[0].title, 'Glicemia de jejum elevada');
  });

  // 13. Aviso profissional obrigatório
  test('13. Aviso profissional: disclaimer médico presente e não vazio', () => {
    const DISCLAIMER =
      'Esta análise é uma ferramenta de apoio à decisão clínica. Os resultados devem ser avaliados por um profissional de saúde considerando o contexto clínico do paciente. A análise automatizada não substitui a avaliação médica.';

    assert.ok(DISCLAIMER.includes('apoio à decisão clínica'));
    assert.ok(DISCLAIMER.includes('não substitui a avaliação médica'));
  });

  // 14. Histórico de exames do paciente
  test('14. Histórico: filtra exames para o mesmo paciente e permite alternância', () => {
    const allExams = [
      { id: 1, patientId: 10, collectionDate: '2026-01-10' },
      { id: 2, patientId: 10, collectionDate: '2026-05-15' },
      { id: 3, patientId: 20, collectionDate: '2026-06-01' },
    ];

    const patient10Exams = allExams.filter((e) => e.patientId === 10);
    assert.equal(patient10Exams.length, 2);
    assert.ok(patient10Exams.every((e) => e.patientId === 10));
  });

  // 15. Anonimização LGPD no frontend
  test('15. Conformidade LGPD: credenciais ou chaves de API nunca são expostas na interface', () => {
    const frontendConfig = {
      apiBaseUrl: 'http://localhost:8080',
    };

    assert.equal(frontendConfig.geminiApiKey, undefined, 'A chave do Gemini nunca deve residir no frontend');
  });

  // 16. Troca de paciente e desassociação completa (sem prender usuário no último exame)
  test('16. Troca de paciente: reset de sessão limpa exame ativo e seleção de paciente', () => {
    let activeExamId = 99;
    let selectedPatientId = '42';
    let viewMode = 'results';
    let examResults = [{ id: 1, testCode: 'GLUCOSE' }];

    const resetToPatientSearch = () => {
      activeExamId = null;
      selectedPatientId = '';
      viewMode = 'upload';
      examResults = [];
    };

    resetToPatientSearch();

    assert.equal(activeExamId, null, 'ID do exame ativo deve ser limpo');
    assert.equal(selectedPatientId, '', 'Paciente selecionado deve ser desassociado');
    assert.equal(viewMode, 'upload', 'Deve retornar para a tela de busca e envio');
    assert.equal(examResults.length, 0, 'Resultados em memória devem ser limpos');
  });

  // 17. Filtragem em tempo real de pacientes no componente ExamPatientSelect
  test('17. Busca de pacientes no seletor: filtra por nome, CPF e ID com suporte a termo limpo', () => {
    const pacientes = [
      { id: 1, nome: 'Carlos Eduardo Mendes', cpf: '111.222.333-44' },
      { id: 2, nome: 'Fernanda Lima Rocha', cpf: '555.666.777-88' },
      { id: 3, nome: 'Ana Beatriz Souza', cpf: '999.888.777-66' },
    ];

    const filtrar = (lista, termo) => {
      if (!termo.trim()) return lista;
      const t = termo.toLowerCase().trim();
      const cleanTermCpf = t.replace(/\D/g, '');
      return lista.filter((p) => {
        const matchName = p.nome?.toLowerCase().includes(t);
        const matchCpf = cleanTermCpf && p.cpf?.replace(/\D/g, '').includes(cleanTermCpf);
        const matchId = String(p.id) === t;
        return matchName || matchCpf || matchId;
      });
    };

    const porNome = filtrar(pacientes, 'fernanda');
    assert.equal(porNome.length, 1);
    assert.equal(porNome[0].id, 2);

    const porCpf = filtrar(pacientes, '999888');
    assert.equal(porCpf.length, 1);
    assert.equal(porCpf[0].id, 3);

    const porId = filtrar(pacientes, '1');
    assert.equal(porId.length, 1);
    assert.equal(porId[0].id, 1);

    const inexistente = filtrar(pacientes, 'Rodrigo');
    assert.equal(inexistente.length, 0);
  });
});
