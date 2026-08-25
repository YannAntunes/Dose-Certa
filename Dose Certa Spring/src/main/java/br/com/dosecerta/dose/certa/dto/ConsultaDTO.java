package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Consulta;
import br.com.dosecerta.dose.certa.entity.TipoCalculo;

import java.time.LocalDateTime;

/**
 * FIX B-04: Inclui pacienteId e medicamentoId no DTO de resposta.
 * Isso permite ao frontend "reabrir" um atendimento usando IDs em vez
 * de buscar por nome (que pode duplicar em caso de nomes iguais).
 */
public class ConsultaDTO {

    private Long id;
    private Long pacienteId;       // FIX B-04
    private String paciente;
    private Long medicamentoId;    // FIX B-04
    private String medicamento;
    private String profissional;
    private String tipoProfissional;   // "medico" | "enfermeiro"
    private TipoCalculo tipoCalculo;
    private double resultado;
    private String unidade;
    private LocalDateTime dataHora;
    private boolean alertaDoseMaxima;
    private String mensagemAlerta;
    private String observacoes;

    public ConsultaDTO(Consulta consulta) {
        this.id           = consulta.getId();
        this.pacienteId   = consulta.getPaciente().getId();   // FIX B-04
        this.paciente     = consulta.getPaciente().getNome();
        this.medicamentoId = consulta.getMedicamento().getId(); // FIX B-04
        this.medicamento  = consulta.getMedicamento().getNome();
        this.tipoCalculo  = consulta.getTipoCalculo();
        this.resultado    = consulta.getResultadoCalculo();
        this.unidade      = consulta.getUnidadeResultado();
        this.dataHora     = consulta.getDataHora();
        this.alertaDoseMaxima = consulta.isAlertaDoseMaxima();
        this.mensagemAlerta   = consulta.getMensagemAlerta();
        this.observacoes      = consulta.getObservacoes();

        if (consulta.getMedico() != null) {
            this.profissional     = consulta.getMedico().getNome();
            this.tipoProfissional = "medico";
        } else if (consulta.getEnfermeiro() != null) {
            this.profissional     = consulta.getEnfermeiro().getNome();
            this.tipoProfissional = "enfermeiro";
        } else {
            this.profissional     = "Não informado";
            this.tipoProfissional = "desconhecido";
        }
    }

    public Long getId()                    { return id; }
    public Long getPacienteId()            { return pacienteId; }
    public String getPaciente()            { return paciente; }
    public Long getMedicamentoId()         { return medicamentoId; }
    public String getMedicamento()         { return medicamento; }
    public String getProfissional()        { return profissional; }
    public String getTipoProfissional()    { return tipoProfissional; }
    public TipoCalculo getTipoCalculo()    { return tipoCalculo; }
    public double getResultado()           { return resultado; }
    public String getUnidade()             { return unidade; }
    public LocalDateTime getDataHora()     { return dataHora; }
    public boolean isAlertaDoseMaxima()    { return alertaDoseMaxima; }
    public String getMensagemAlerta()      { return mensagemAlerta; }
    public String getObservacoes()         { return observacoes; }
}
