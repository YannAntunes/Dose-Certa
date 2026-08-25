package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.*;
import br.com.dosecerta.dose.certa.repository.ConsultaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Testes unitários do ConsultaService.
 * Cobre: fórmulas de cálculo, tratamento de divisão por zero,
 * ajuste de dose máxima, e validações de entrada.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)  // permite stubs não usados em testes de exceção
@DisplayName("ConsultaService — Testes de Cálculo de Dosagem")
class ConsultaServiceTest {

    @Mock
    private ConsultaRepository consultaRepository;

    @InjectMocks
    private ConsultaService consultaService;

    private Paciente paciente;
    private Medicamento medicamento;
    private Medico medico;

    @BeforeEach
    void setUp() {
        paciente = new Paciente();
        paciente.setNome("João Silva");
        paciente.setPeso(70.0);
        paciente.setIdade(35);
        paciente.setCpf("529.982.247-25");

        medicamento = new Medicamento();
        medicamento.setNome("Dipirona");
        medicamento.setDosePorKg(10.0);   // 10 mg/kg
        medicamento.setDoseMaxima(1000.0); // 1000 mg máximo
        medicamento.setDoseDisponivel(500.0);  // 500 mg por ampola
        medicamento.setVolumeDisponivel(10.0); // 10 mL por ampola → 50 mg/mL
        medicamento.setFatorGotejamento(20);   // 20 gotas/mL
        medicamento.setTempoMinutos(60);       // 60 minutos

        medico = new Medico();
        medico.setNome("Dr. Carlos");
        medico.setCrm(12345);
        medico.setEstado("SP");

        // Mock do repositório: retorna a consulta salva
        when(consultaRepository.save(any(Consulta.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ════════════════════════════════════════════════════════════════
    // Testes de fórmula DOSE_MGKG
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("DOSE_MGKG: deve calcular peso × dose_por_kg corretamente")
    void calcularDoseMgKg_calculaCorretamente() {
        // 70 kg × 10 mg/kg = 700 mg
        Consulta resultado = consultaService.salvar(
                paciente, medicamento, medico, null, TipoCalculo.DOSE_MGKG, null);

        assertThat(resultado.getResultadoCalculo()).isEqualTo(700.0);
        assertThat(resultado.getUnidadeResultado()).isEqualTo("mg");
        assertThat(resultado.isAlertaDoseMaxima()).isFalse();
    }

    @Test
    @DisplayName("DOSE_MGKG: deve aplicar dose máxima quando cálculo exceder o limite")
    void calcularDoseMgKg_aplicaDoseMaxima_quandoExcede() {
        paciente.setPeso(200.0); // 200 kg × 10 mg/kg = 2000 mg > 1000 mg (máximo)

        Consulta resultado = consultaService.salvar(
                paciente, medicamento, medico, null, TipoCalculo.DOSE_MGKG, null);

        assertThat(resultado.getResultadoCalculo()).isEqualTo(1000.0);
        assertThat(resultado.isAlertaDoseMaxima()).isTrue();
        assertThat(resultado.getMensagemAlerta()).isNotBlank();
    }

    // ════════════════════════════════════════════════════════════════
    // Testes de fórmula VOLUME_MLH
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("VOLUME_MLH: deve calcular (peso × dosePorKg) / concentração corretamente")
    void calcularVolumeMlH_calculaCorretamente() {
        // concentração = 500mg / 10mL = 50 mg/mL
        // dose total = 70kg × 10 mg/kg = 700 mg
        // volume = 700 / 50 = 14 mL/h
        Consulta resultado = consultaService.salvar(
                paciente, medicamento, medico, null, TipoCalculo.VOLUME_MLH, null);

        assertThat(resultado.getResultadoCalculo()).isEqualTo(14.0);
        assertThat(resultado.getUnidadeResultado()).isEqualTo("mL/h");
    }

    @Test
    @DisplayName("VOLUME_MLH: deve lançar exceção se volumeDisponivel for zero")
    void calcularVolumeMlH_lancaExcecao_seVolumeZero() {
        medicamento.setVolumeDisponivel(0.0);

        assertThatThrownBy(() ->
                consultaService.salvar(paciente, medicamento, medico, null, TipoCalculo.VOLUME_MLH, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Volume disponível");
    }

    @Test
    @DisplayName("VOLUME_MLH: deve lançar exceção se doseDisponivel for zero")
    void calcularVolumeMlH_lancaExcecao_seDoseZero() {
        medicamento.setDoseDisponivel(0.0);

        assertThatThrownBy(() ->
                consultaService.salvar(paciente, medicamento, medico, null, TipoCalculo.VOLUME_MLH, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Dose disponível");
    }

    // ════════════════════════════════════════════════════════════════
    // Testes de fórmula GOTAS_MIN
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GOTAS_MIN: deve calcular (volume × fator) / tempo corretamente")
    void calcularGotasMin_calculaCorretamente() {
        // dose total = 70 × 10 = 700 mg
        // concentração = 500/10 = 50 mg/mL
        // volume = 700/50 = 14 mL
        // gotas = (14 × 20) / 60 ≈ 4.67 gotas/min
        Consulta resultado = consultaService.salvar(
                paciente, medicamento, medico, null, TipoCalculo.GOTAS_MIN, null);

        double esperado = (14.0 * 20) / 60.0;
        assertThat(resultado.getResultadoCalculo()).isCloseTo(esperado, withinPercentage(0.01));
        assertThat(resultado.getUnidadeResultado()).isEqualTo("gotas/min");
    }

    @Test
    @DisplayName("GOTAS_MIN: deve lançar exceção se tempoMinutos for zero (FIX C-05)")
    void calcularGotasMin_lancaExcecao_seTempoZero() {
        medicamento.setTempoMinutos(0); // FIX C-05: divisão por zero prevenida

        assertThatThrownBy(() ->
                consultaService.salvar(paciente, medicamento, medico, null, TipoCalculo.GOTAS_MIN, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tempo de infusão");
    }

    @Test
    @DisplayName("GOTAS_MIN: deve lançar exceção se fatorGotejamento for zero (FIX C-05)")
    void calcularGotasMin_lancaExcecao_seFatorZero() {
        medicamento.setFatorGotejamento(0);

        assertThatThrownBy(() ->
                consultaService.salvar(paciente, medicamento, medico, null, TipoCalculo.GOTAS_MIN, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Fator de gotejamento");
    }

    // ════════════════════════════════════════════════════════════════
    // Testes de validação de entradas obrigatórias
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Deve lançar exceção quando paciente for null")
    void salvar_lancaExcecao_sePacienteNull() {
        assertThatThrownBy(() ->
                consultaService.salvar(null, medicamento, medico, null, TipoCalculo.DOSE_MGKG, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Paciente obrigatório");
    }

    @Test
    @DisplayName("Deve lançar exceção quando medicamento for null")
    void salvar_lancaExcecao_seMedicamentoNull() {
        assertThatThrownBy(() ->
                consultaService.salvar(paciente, null, medico, null, TipoCalculo.DOSE_MGKG, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Medicamento obrigatório");
    }

    @Test
    @DisplayName("Deve lançar exceção quando nem médico nem enfermeiro forem informados")
    void salvar_lancaExcecao_semProfissional() {
        assertThatThrownBy(() ->
                consultaService.salvar(paciente, medicamento, null, null, TipoCalculo.DOSE_MGKG, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("médico ou enfermeiro");
    }

    @Test
    @DisplayName("Deve aceitar enfermeiro como profissional responsável")
    void salvar_aceitaEnfermeiro_comoProfissional() {
        Enfermeiro enfermeiro = new Enfermeiro();
        enfermeiro.setNome("Ana Souza");
        enfermeiro.setCoren("SP-12345");
        enfermeiro.setEstado("SP");

        Consulta resultado = consultaService.salvar(
                paciente, medicamento, null, enfermeiro, TipoCalculo.DOSE_MGKG, null);

        assertThat(resultado.getEnfermeiro()).isEqualTo(enfermeiro);
        assertThat(resultado.getMedico()).isNull();
    }

    @Test
    @DisplayName("Deve persistir observações corretamente")
    void salvar_persisteObservacoes() {
        String obs = "Paciente em jejum. Aplicar com soro fisiológico.";
        Consulta resultado = consultaService.salvar(
                paciente, medicamento, medico, null, TipoCalculo.DOSE_MGKG, obs);

        assertThat(resultado.getObservacoes()).isEqualTo(obs);
    }

    @Test
    @DisplayName("dataHora deve ser definida automaticamente pelo service (FIX B-07)")
    void salvar_defineDataHoraAutomaticamente() {
        Consulta resultado = consultaService.salvar(
                paciente, medicamento, medico, null, TipoCalculo.DOSE_MGKG, null);

        assertThat(resultado.getDataHora()).isNotNull();
    }
}
