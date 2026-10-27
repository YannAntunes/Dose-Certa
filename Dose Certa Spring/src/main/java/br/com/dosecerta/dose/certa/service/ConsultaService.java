package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.*;
import br.com.dosecerta.dose.certa.repository.ConsultaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Serviço central de cálculo e persistência de consultas.
 * Toda lógica de cálculo está unificada aqui.
 */
@Service
public class ConsultaService {

    private final ConsultaRepository consultaRepository;

    public ConsultaService(ConsultaRepository consultaRepository) {
        this.consultaRepository = consultaRepository;
    }

    public Consulta salvar(
            Paciente paciente,
            Medicamento medicamento,
            Medico medico,
            Enfermeiro enfermeiro,
            TipoCalculo tipoCalculo,
            String observacoes) {

        if (paciente == null) {
            throw new IllegalArgumentException("Paciente obrigatório");
        }

        if (medicamento == null) {
            throw new IllegalArgumentException("Medicamento obrigatório");
        }

        if (medico == null && enfermeiro == null) {
            throw new IllegalArgumentException("Informe médico ou enfermeiro");
        }

        // FIX C-05: Validar campos necessários para evitar divisão por zero
        validarCamposMedicamento(medicamento, tipoCalculo);

        double resultado;
        String unidade;

        boolean alertaDoseMaxima = false;
        String mensagemAlerta = null;

        switch (tipoCalculo) {

            case DOSE_MGKG -> {
                resultado = paciente.getPeso() * medicamento.getDosePorKg();
                unidade = "mg";
            }

            case VOLUME_MLH -> {
                // FIX C-05: volumeDisponivel já validado como > 0 acima
                double concentracao = medicamento.getDoseDisponivel() / medicamento.getVolumeDisponivel();

                resultado = (paciente.getPeso() * medicamento.getDosePorKg()) / concentracao;

                unidade = "mL/h";
            }

            case GOTAS_MIN -> {
                double doseTotalMg = paciente.getPeso() * medicamento.getDosePorKg();

                // FIX C-05: volumeDisponivel e tempoMinutos já validados como > 0 acima
                double concentracao = medicamento.getDoseDisponivel() / medicamento.getVolumeDisponivel();

                double volumeMl = doseTotalMg / concentracao;

                resultado = (volumeMl * medicamento.getFatorGotejamento()) /
                        medicamento.getTempoMinutos();

                unidade = "gotas/min";
            }

            default -> throw new IllegalArgumentException("Tipo de cálculo inválido");
        }

        // 🚨 AJUSTE SEGURO DA DOSE MÁXIMA (APÓS O CÁLCULO)
        if (resultado > medicamento.getDoseMaxima()) {
            resultado = medicamento.getDoseMaxima();
            alertaDoseMaxima = true;
            mensagemAlerta = "A dose calculada ultrapassou o limite máximo permitido. " +
                    "A prescrição foi ajustada automaticamente para a dose segura.";
        }

        Consulta consulta = new Consulta();
        consulta.setPaciente(paciente);
        consulta.setMedicamento(medicamento);
        consulta.setMedico(medico);
        consulta.setEnfermeiro(enfermeiro);
        consulta.setTipoCalculo(tipoCalculo);
        consulta.setResultadoCalculo(resultado);
        consulta.setUnidadeResultado(unidade);
        consulta.setAlertaDoseMaxima(alertaDoseMaxima);
        consulta.setMensagemAlerta(mensagemAlerta);
        consulta.setDataHora(LocalDateTime.now()); // FIX B-07: inicializado apenas uma vez aqui
        consulta.setObservacoes(observacoes);

        return consultaRepository.save(consulta);
    }

    /**
     * FIX C-05: Valida todos os campos numéricos usados nos cálculos
     * antes de executar qualquer divisão, prevenindo divisão por zero.
     */
    private void validarCamposMedicamento(Medicamento medicamento, TipoCalculo tipoCalculo) {
        if (medicamento.getDosePorKg() <= 0) {
            throw new IllegalArgumentException(
                    "O campo 'Dose por kg' do medicamento deve ser maior que zero.");
        }

        if (tipoCalculo == TipoCalculo.VOLUME_MLH || tipoCalculo == TipoCalculo.GOTAS_MIN) {
            if (medicamento.getDoseDisponivel() <= 0) {
                throw new IllegalArgumentException(
                        "O campo 'Dose disponível' do medicamento deve ser maior que zero para este tipo de cálculo.");
            }
            if (medicamento.getVolumeDisponivel() <= 0) {
                throw new IllegalArgumentException(
                        "O campo 'Volume disponível' do medicamento deve ser maior que zero para este tipo de cálculo.");
            }
        }

        if (tipoCalculo == TipoCalculo.GOTAS_MIN) {
            if (medicamento.getFatorGotejamento() <= 0) {
                throw new IllegalArgumentException(
                        "O campo 'Fator de gotejamento' do medicamento deve ser maior que zero.");
            }
            if (medicamento.getTempoMinutos() <= 0) {
                throw new IllegalArgumentException(
                        "O campo 'Tempo de infusão' do medicamento deve ser maior que zero.");
            }
        }
    }

    public List<Consulta> listar() {
        return consultaRepository.findAllByOrderByDataHoraDesc();
    }

    public List<Consulta> listarPorPaciente(Long pacienteId) {
        return consultaRepository.findByPacienteIdOrderByDataHoraDesc(pacienteId);
    }
}
