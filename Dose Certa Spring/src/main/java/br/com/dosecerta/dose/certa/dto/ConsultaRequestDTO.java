package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.TipoCalculo;

public class ConsultaRequestDTO {

    private Long pacienteId;
    private Long medicamentoId;
    private Long medicoId;
    private Long enfermeiroId;
    private TipoCalculo tipoCalculo;

    public Long getPacienteId() {
        return pacienteId;
    }

    public Long getMedicamentoId() {
        return medicamentoId;
    }

    public Long getMedicoId() {
        return medicoId;
    }

    public Long getEnfermeiroId() {
        return enfermeiroId;
    }

    public TipoCalculo getTipoCalculo() {
        return tipoCalculo;
    }
}
