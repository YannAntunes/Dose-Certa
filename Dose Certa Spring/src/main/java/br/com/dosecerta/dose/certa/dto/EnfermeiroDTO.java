package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Enfermeiro;

public class EnfermeiroDTO {

    private Long id;
    private String nome;
    private String coren;
    private String estado;

    public EnfermeiroDTO(Enfermeiro enfermeiro) {
        this.id = enfermeiro.getId();
        this.nome = enfermeiro.getNome();
        this.coren = enfermeiro.getCoren();
        this.estado = enfermeiro.getEstado();
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getCoren() {
        return coren;
    }

    public String getEstado() {
        return estado;
    }
}
