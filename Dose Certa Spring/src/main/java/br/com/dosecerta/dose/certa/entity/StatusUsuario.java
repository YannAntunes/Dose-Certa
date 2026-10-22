package br.com.dosecerta.dose.certa.entity;

public enum StatusUsuario {
    PENDENTE("Pendente de Aprovação"),
    ATIVO("Ativo"),
    REJEITADO("Rejeitado"),
    INATIVO("Inativo");

    private final String descricao;

    StatusUsuario(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
