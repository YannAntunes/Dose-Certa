package br.com.dosecerta.dose.certa.entity;

public enum TipoCalculo {
    DOSE_MGKG("Dose (mg/kg)"),
    VOLUME_MLH("Volume (mL/h)"),
    GOTAS_MIN("Gotas por minuto");

    private final String nome;

    TipoCalculo(String nome) {
        this.nome = nome;
    }

    public String getNome() {
        return nome;
    }
}

