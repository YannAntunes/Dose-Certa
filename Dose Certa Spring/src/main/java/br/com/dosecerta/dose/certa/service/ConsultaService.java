package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.*;
import br.com.dosecerta.dose.certa.repository.ConsultaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

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
            String observacoes
    ) {

        if (paciente == null) {
            throw new IllegalArgumentException("Paciente obrigatório");
        }

        if (medicamento == null) {
            throw new IllegalArgumentException("Medicamento obrigatório");
        }

        if (medico == null && enfermeiro == null) {
            throw new IllegalArgumentException("Informe médico ou enfermeiro");
        }

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
                double concentracao =
                        medicamento.getDoseDisponivel() / medicamento.getVolumeDisponivel();

                resultado =
                        (paciente.getPeso() * medicamento.getDosePorKg()) / concentracao;

                unidade = "mL/h";
            }

            case GOTAS_MIN -> {
                double doseTotalMg =
                        paciente.getPeso() * medicamento.getDosePorKg();

                double concentracao =
                        medicamento.getDoseDisponivel() / medicamento.getVolumeDisponivel();

                double volumeMl = doseTotalMg / concentracao;

                resultado =
                        (volumeMl * medicamento.getFatorGotejamento()) /
                                medicamento.getTempoMinutos();

                unidade = "gotas/min";
            }

            default -> throw new IllegalArgumentException("Tipo de cálculo inválido");
        }

        // 🚨 AJUSTE SEGURO DA DOSE MÁXIMA (APÓS O CÁLCULO)
        if (resultado > medicamento.getDoseMaxima()) {
            resultado = medicamento.getDoseMaxima();
            alertaDoseMaxima = true;
            mensagemAlerta =
                    "A dose calculada ultrapassou o limite máximo permitido. " +
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
        consulta.setDataHora(LocalDateTime.now());
        consulta.setObservacoes(observacoes);

        return consultaRepository.save(consulta);
    }

    public List<Consulta> listar() {
        return consultaRepository.findAllByOrderByDataHoraDesc();
    }
}
