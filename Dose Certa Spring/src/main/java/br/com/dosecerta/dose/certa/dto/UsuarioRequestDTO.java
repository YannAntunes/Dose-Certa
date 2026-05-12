package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;

public class UsuarioRequestDTO {

    private String login;
    private String senha;
    private PerfilUsuario perfil;

    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public PerfilUsuario getPerfil() { return perfil; }
    public void setPerfil(PerfilUsuario perfil) { this.perfil = perfil; }
}
