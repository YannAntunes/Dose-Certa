package br.com.dosecerta.dose.certa.dto;

import java.time.LocalDateTime;

public class ConsultaResponseDTO {

    private Long id;
    private String paciente;
    private String medicamento;
    private String profissional;
    private String tipoCalculo;
    private Double resultado;
    private String unidade;
    private boolean alertaDoseMaxima;
    private String mensagemAlerta;
    private LocalDateTime dataHora;

    public ConsultaResponseDTO(
            Long id,
            String paciente,
            String medicamento,
            String profissional,
            String tipoCalculo,
            Double resultado,
            String unidade,
            boolean alertaDoseMaxima,
            String mensagemAlerta,
            LocalDateTime dataHora
    ) {
        this.id = id;
        this.paciente = paciente;
        this.medicamento = medicamento;
        this.profissional = profissional;
        this.tipoCalculo = tipoCalculo;
        this.resultado = resultado;
        this.unidade = unidade;
        this.alertaDoseMaxima = alertaDoseMaxima;
        this.mensagemAlerta = mensagemAlerta;
        this.dataHora = dataHora;
    }

}
