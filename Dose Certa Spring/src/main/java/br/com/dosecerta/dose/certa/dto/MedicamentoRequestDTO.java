package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.entity.TipoCalculo;

/**
 * FIX C-06: DTO de entrada para criação/atualização de medicamentos.
 * Substitui o uso direto da entidade JPA no controller,
 * impedindo que clientes passem campos internos como 'id'.
 */
public class MedicamentoRequestDTO {

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

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public double getDosePorKg() { return dosePorKg; }
    public void setDosePorKg(double dosePorKg) { this.dosePorKg = dosePorKg; }

    public double getDoseMaxima() { return doseMaxima; }
    public void setDoseMaxima(double doseMaxima) { this.doseMaxima = doseMaxima; }

    public double getDoseDisponivel() { return doseDisponivel; }
    public void setDoseDisponivel(double doseDisponivel) { this.doseDisponivel = doseDisponivel; }

    public double getVolumeDisponivel() { return volumeDisponivel; }
    public void setVolumeDisponivel(double volumeDisponivel) { this.volumeDisponivel = volumeDisponivel; }

    public int getFatorGotejamento() { return fatorGotejamento; }
    public void setFatorGotejamento(int fatorGotejamento) { this.fatorGotejamento = fatorGotejamento; }

    public int getTempoMinutos() { return tempoMinutos; }
    public void setTempoMinutos(int tempoMinutos) { this.tempoMinutos = tempoMinutos; }

    public String getIntervalo() { return intervalo; }
    public void setIntervalo(String intervalo) { this.intervalo = intervalo; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public TipoCalculo getTipoPadrao() { return tipoPadrao; }
    public void setTipoPadrao(TipoCalculo tipoPadrao) { this.tipoPadrao = tipoPadrao; }

    /** Converte para entidade JPA sem expor o campo id. */
    public Medicamento toEntity() {
        Medicamento m = new Medicamento();
        m.setNome(nome);
        m.setBrand(brand);
        m.setDosePorKg(dosePorKg);
        m.setDoseMaxima(doseMaxima);
        m.setDoseDisponivel(doseDisponivel);
        m.setVolumeDisponivel(volumeDisponivel);
        m.setFatorGotejamento(fatorGotejamento);
        m.setTempoMinutos(tempoMinutos);
        m.setIntervalo(intervalo);
        m.setNotas(notas);
        m.setTipoPadrao(tipoPadrao);
        return m;
    }
}
