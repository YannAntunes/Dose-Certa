package br.com.dosecerta.dose.certa.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "medicamentos")
public class Medicamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String brand;

    // mg/kg
    @Column(nullable = false)
    private double dosePorKg;

    // mg
    @Column(nullable = false)
    private double doseMaxima;

    private String intervalo;

    private String notas;

    // ===== Dados farmacológicos =====
    private double doseDisponivel;    // mg
    private double volumeDisponivel;  // mL
    private int fatorGotejamento;     // gotas/mL
    private int tempoMinutos;         // tempo de infusão

    @Enumerated(EnumType.STRING)
    private TipoCalculo tipoPadrao;

    // Construtor exigido pelo JPA
    public Medicamento() {}

    // getters e setters (sem lógica)
    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public double getDosePorKg() {
        return dosePorKg;
    }

    public void setDosePorKg(double dosePorKg) {
        this.dosePorKg = dosePorKg;
    }

    public double getDoseMaxima() {
        return doseMaxima;
    }

    public void setDoseMaxima(double doseMaxima) {
        this.doseMaxima = doseMaxima;
    }

    public String getIntervalo() {
        return intervalo;
    }

    public void setIntervalo(String intervalo) {
        this.intervalo = intervalo;
    }

    public String getNotas() {
        return notas;
    }

    public void setNotas(String notas) {
        this.notas = notas;
    }

    public double getDoseDisponivel() {
        return doseDisponivel;
    }

    public void setDoseDisponivel(double doseDisponivel) {
        this.doseDisponivel = doseDisponivel;
    }

    public double getVolumeDisponivel() {
        return volumeDisponivel;
    }

    public void setVolumeDisponivel(double volumeDisponivel) {
        this.volumeDisponivel = volumeDisponivel;
    }

    public int getFatorGotejamento() {
        return fatorGotejamento;
    }

    public void setFatorGotejamento(int fatorGotejamento) {
        this.fatorGotejamento = fatorGotejamento;
    }

    public int getTempoMinutos() {
        return tempoMinutos;
    }

    public void setTempoMinutos(int tempoMinutos) {
        this.tempoMinutos = tempoMinutos;
    }

    public TipoCalculo getTipoPadrao() {
        return tipoPadrao;
    }

    public void setTipoPadrao(TipoCalculo tipoPadrao) {
        this.tipoPadrao = tipoPadrao;
    }
}
