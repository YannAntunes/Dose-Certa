package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.controller.RegraClinicaException;
import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Testes unitários do PacienteService.
 * Cobre: validação de CPF, formatação de documentos, validações de negócio.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PacienteService — Testes de Validação de Paciente")
class PacienteServiceTest {

    @Mock
    private PacienteRepository repository;

    @InjectMocks
    private PacienteService service;

    private Paciente pacienteValido;

    @BeforeEach
    void setUp() {
        pacienteValido = new Paciente();
        pacienteValido.setNome("Maria Oliveira");
        pacienteValido.setCpf("529.982.247-25");
        pacienteValido.setPeso(65.0);
        pacienteValido.setIdade(28);
        pacienteValido.setTipoDocumento("CPF");
        pacienteValido.setPaisOrigem("Brasil");
    }

    // ════════════════════════════════════════════════════════════════
    // Testes de validação de CPF
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("formatarDocumento: deve formatar CPF válido corretamente")
    void formatarDocumento_CPF_valido() {
        String resultado = PacienteService.formatarDocumento("52998224725", "CPF");
        assertThat(resultado).isEqualTo("529.982.247-25");
    }

    @Test
    @DisplayName("formatarDocumento: deve formatar CPF já formatado sem alterar")
    void formatarDocumento_CPF_jaFormatado() {
        String resultado = PacienteService.formatarDocumento("529.982.247-25", "CPF");
        assertThat(resultado).isEqualTo("529.982.247-25");
    }

    @Test
    @DisplayName("formatarDocumento: deve rejeitar CPF com dígitos iguais")
    void formatarDocumento_CPF_digitosIguais() {
        assertThatThrownBy(() -> PacienteService.formatarDocumento("11111111111", "CPF"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("CPF inválido");
    }

    @Test
    @DisplayName("formatarDocumento: deve rejeitar CPF matematicamente inválido")
    void formatarDocumento_CPF_invalido() {
        assertThatThrownBy(() -> PacienteService.formatarDocumento("12345678900", "CPF"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("CPF inválido");
    }

    @Test
    @DisplayName("formatarDocumento: deve aceitar passaporte sem validar matematicamente")
    void formatarDocumento_Passaporte_aceito() {
        String resultado = PacienteService.formatarDocumento("AB123456", "PASSAPORTE");
        assertThat(resultado).isEqualTo("AB123456");
    }

    @Test
    @DisplayName("formatarDocumento: deve retornar null se documento for null")
    void formatarDocumento_null_retornaNull() {
        String resultado = PacienteService.formatarDocumento(null, "CPF");
        assertThat(resultado).isNull();
    }

    // ════════════════════════════════════════════════════════════════
    // Testes de validação ao salvar
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("salvar: deve persistir paciente válido com CPF correto")
    void salvar_pacienteValido_persisteCorreto() {
        when(repository.existsByCpf(anyString())).thenReturn(false);
        when(repository.save(any(Paciente.class))).thenAnswer(inv -> inv.getArgument(0));

        Paciente resultado = service.salvar(pacienteValido);

        assertThat(resultado.getNome()).isEqualTo("Maria Oliveira");
        assertThat(resultado.getCpf()).isEqualTo("529.982.247-25");
        verify(repository).save(any(Paciente.class));
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se nome for vazio")
    void salvar_lancaExcecao_nomeVazio() {
        pacienteValido.setNome("   ");
        assertThatThrownBy(() -> service.salvar(pacienteValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Nome inválido");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se peso for zero")
    void salvar_lancaExcecao_pesoZero() {
        pacienteValido.setPeso(0.0);
        assertThatThrownBy(() -> service.salvar(pacienteValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Peso inválido");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se peso exceder 500kg")
    void salvar_lancaExcecao_pesoAcima500() {
        pacienteValido.setPeso(501.0);
        assertThatThrownBy(() -> service.salvar(pacienteValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Peso inválido");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se idade for negativa")
    void salvar_lancaExcecao_idadeNegativa() {
        pacienteValido.setIdade(-1);
        assertThatThrownBy(() -> service.salvar(pacienteValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Idade inválida");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se CPF já estiver cadastrado")
    void salvar_lancaExcecao_cpfDuplicado() {
        when(repository.existsByCpf("529.982.247-25")).thenReturn(true);

        assertThatThrownBy(() -> service.salvar(pacienteValido))
                .isInstanceOf(RegraClinicaException.class)
                .hasMessageContaining("Documento já cadastrado");
    }

    @Test
    @DisplayName("deletar: deve lançar exceção se paciente não existir")
    void deletar_lancaExcecao_sePacienteNaoExiste() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Paciente não encontrado");
    }

    @Test
    @DisplayName("deletar: deve chamar deleteById se paciente existir")
    void deletar_chamaDeletion_sePacienteExiste() {
        when(repository.existsById(1L)).thenReturn(true);
        service.deletar(1L);
        verify(repository).deleteById(1L);
    }
}
