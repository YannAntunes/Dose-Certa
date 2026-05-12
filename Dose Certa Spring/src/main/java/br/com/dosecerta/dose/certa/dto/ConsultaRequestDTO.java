package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.TipoCalculo;

public class ConsultaRequestDTO {

    private Long pacienteId;
    private Long medicamentoId;
    private Long medicoId;
    private Long enfermeiroId;
    private TipoCalculo tipoCalculo;
    private String observacoes;

    public Long getPacienteId() { return pacienteId; }
    public void setPacienteId(Long pacienteId) { this.pacienteId = pacienteId; }

    public Long getMedicamentoId() { return medicamentoId; }
    public void setMedicamentoId(Long medicamentoId) { this.medicamentoId = medicamentoId; }

    public Long getMedicoId() { return medicoId; }
    public void setMedicoId(Long medicoId) { this.medicoId = medicoId; }

    public Long getEnfermeiroId() { return enfermeiroId; }
    public void setEnfermeiroId(Long enfermeiroId) { this.enfermeiroId = enfermeiroId; }

    public TipoCalculo getTipoCalculo() { return tipoCalculo; }
    public void setTipoCalculo(TipoCalculo tipoCalculo) { this.tipoCalculo = tipoCalculo; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
}
