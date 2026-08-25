package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.repository.MedicamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Testes unitários do MedicamentoService.
 * Cobre: validações de campos obrigatórios e CRUD.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MedicamentoService — Testes de Validação de Medicamento")
class MedicamentoServiceTest {

    @Mock
    private MedicamentoRepository repository;

    @InjectMocks
    private MedicamentoService service;

    private Medicamento medicamentoValido;

    @BeforeEach
    void setUp() {
        medicamentoValido = new Medicamento();
        medicamentoValido.setNome("Amoxicilina");
        medicamentoValido.setDosePorKg(25.0);
        medicamentoValido.setDoseMaxima(3000.0);
        medicamentoValido.setDoseDisponivel(500.0);
        medicamentoValido.setVolumeDisponivel(10.0);
        medicamentoValido.setFatorGotejamento(20);
        medicamentoValido.setTempoMinutos(30);
    }

    @Test
    @DisplayName("salvar: deve persistir medicamento válido")
    void salvar_medicamentoValido() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        Medicamento resultado = service.salvar(medicamentoValido);
        assertThat(resultado.getNome()).isEqualTo("Amoxicilina");
        verify(repository).save(any());
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se nome for vazio")
    void salvar_lancaExcecao_nomeVazio() {
        medicamentoValido.setNome("");
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Nome inválido");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se dosePorKg for zero")
    void salvar_lancaExcecao_dosePorKgZero() {
        medicamentoValido.setDosePorKg(0);
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Dose por Kg");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se doseMaxima for zero")
    void salvar_lancaExcecao_doseMaximaZero() {
        medicamentoValido.setDoseMaxima(0);
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Dose máxima");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se doseDisponivel for zero")
    void salvar_lancaExcecao_doseDisponivelZero() {
        medicamentoValido.setDoseDisponivel(0);
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Dose disponível");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se volumeDisponivel for zero")
    void salvar_lancaExcecao_volumeZero() {
        medicamentoValido.setVolumeDisponivel(0);
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Volume");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se fatorGotejamento for zero")
    void salvar_lancaExcecao_fatorGotejamentoZero() {
        medicamentoValido.setFatorGotejamento(0);
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("gotejamento");
    }

    @Test
    @DisplayName("salvar: deve lançar exceção se tempoMinutos for zero")
    void salvar_lancaExcecao_tempoZero() {
        medicamentoValido.setTempoMinutos(0);
        assertThatThrownBy(() -> service.salvar(medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tempo de infusão");
    }

    @Test
    @DisplayName("atualizar: deve lançar exceção se medicamento não existir")
    void atualizar_lancaExcecao_seMedicamentoNaoExiste() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, medicamentoValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Medicamento não encontrado");
    }

    @Test
    @DisplayName("deletar: deve chamar deleteById se medicamento existir")
    void deletar_chamaDeletion_seMedicamentoExiste() {
        when(repository.existsById(1L)).thenReturn(true);
        service.deletar(1L);
        verify(repository).deleteById(1L);
    }

    @Test
    @DisplayName("deletar: deve lançar exceção se medicamento não existir")
    void deletar_lancaExcecao_seMedicamentoNaoExiste() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Medicamento não encontrado");
    }
}
