package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;

public class RegistroPublicoRequestDTO {

    private String login;
    private String senha;
    private PerfilUsuario perfilSolicitado;

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public PerfilUsuario getPerfilSolicitado() {
        return perfilSolicitado;
    }

    public void setPerfilSolicitado(PerfilUsuario perfilSolicitado) {
        this.perfilSolicitado = perfilSolicitado;
    }
}
