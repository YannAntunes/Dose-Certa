package br.com.dosecerta.dose.certa.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "consultas")
public class Consulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Paciente paciente;

    @ManyToOne(optional = false)
    private Medicamento medicamento;

    @ManyToOne
    private Medico medico;

    @ManyToOne
    private Enfermeiro enfermeiro;

    @Enumerated(EnumType.STRING)
    private TipoCalculo tipoCalculo;

    private double resultadoCalculo;

    private String unidadeResultado;

    private LocalDateTime dataHora;

    @Column(nullable = false)
    private boolean alertaDoseMaxima;

    private String mensagemAlerta;

    // 🔹 CONSTRUTOR VAZIO (OBRIGATÓRIO PARA JPA)
    public Consulta() {
        this.dataHora = LocalDateTime.now();
    }

    // 🔹 GETTERS E SETTERS

    public Long getId() {
        return id;
    }

    public Paciente getPaciente() {
        return paciente;
    }

    public void setPaciente(Paciente paciente) {
        this.paciente = paciente;
    }

    public Medicamento getMedicamento() {
        return medicamento;
    }

    public void setMedicamento(Medicamento medicamento) {
        this.medicamento = medicamento;
    }

    public Medico getMedico() {
        return medico;
    }

    public void setMedico(Medico medico) {
        this.medico = medico;
    }

    public Enfermeiro getEnfermeiro() {
        return enfermeiro;
    }

    public void setEnfermeiro(Enfermeiro enfermeiro) {
        this.enfermeiro = enfermeiro;
    }

    public TipoCalculo getTipoCalculo() {
        return tipoCalculo;
    }

    public void setTipoCalculo(TipoCalculo tipoCalculo) {
        this.tipoCalculo = tipoCalculo;
    }

    public double getResultadoCalculo() {
        return resultadoCalculo;
    }

    public void setResultadoCalculo(double resultadoCalculo) {
        this.resultadoCalculo = resultadoCalculo;
    }

    public String getUnidadeResultado() {
        return unidadeResultado;
    }

    public void setUnidadeResultado(String unidadeResultado) {
        this.unidadeResultado = unidadeResultado;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public void setDataHora(LocalDateTime dataHora) {
        this.dataHora = dataHora;
    }

    public boolean isAlertaDoseMaxima() {
        return alertaDoseMaxima;
    }

    public void setAlertaDoseMaxima(boolean alertaDoseMaxima) {
        this.alertaDoseMaxima = alertaDoseMaxima;
    }

    public String getMensagemAlerta() {
        return mensagemAlerta;
    }

    public void setMensagemAlerta(String mensagemAlerta) {
        this.mensagemAlerta = mensagemAlerta;
    }

}
