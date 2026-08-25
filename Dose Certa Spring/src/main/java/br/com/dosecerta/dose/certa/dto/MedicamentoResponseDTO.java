package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.entity.TipoCalculo;

/**
 * DTO de resposta para Medicamento — expõe todos os campos necessários
 * para o frontend, com nomes alinhados ao que o frontend espera.
 */
public class MedicamentoResponseDTO {

    private Long id;
    private String nome;
    private String brand;
    private double dosePorKg;
    private double doseMaxima;
    private double doseDisponivel;
    private double volumeDisponivel;
    private int fatorGotejamento;
    private int tempoMinutos;
    private String intervalo;
    private String notas;
    private TipoCalculo tipoPadrao;

    public MedicamentoResponseDTO(Medicamento m) {
        this.id = m.getId();
        this.nome = m.getNome();
        this.brand = m.getBrand();
        this.dosePorKg = m.getDosePorKg();
        this.doseMaxima = m.getDoseMaxima();
        this.doseDisponivel = m.getDoseDisponivel();
        this.volumeDisponivel = m.getVolumeDisponivel();
        this.fatorGotejamento = m.getFatorGotejamento();
        this.tempoMinutos = m.getTempoMinutos();
        this.intervalo = m.getIntervalo();
        this.notas = m.getNotas();
        this.tipoPadrao = m.getTipoPadrao();
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getBrand() { return brand; }
    public double getDosePorKg() { return dosePorKg; }
    public double getDoseMaxima() { return doseMaxima; }
    public double getDoseDisponivel() { return doseDisponivel; }
    public double getVolumeDisponivel() { return volumeDisponivel; }
    public int getFatorGotejamento() { return fatorGotejamento; }
    public int getTempoMinutos() { return tempoMinutos; }
    public String getIntervalo() { return intervalo; }
    public String getNotas() { return notas; }
    public TipoCalculo getTipoPadrao() { return tipoPadrao; }
}
