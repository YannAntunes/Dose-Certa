package br.com.dosecerta.dose.certa.entity;

public enum PerfilUsuario {

    ADMIN("Administrador"),
    MEDICO("Médico"),
    ENFERMEIRO("Enfermeiro"),
    RECEPCAO("Recepção");

    private final String descricao;

    PerfilUsuario(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
