package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;

public class LoginResponseDTO {

    private Long id;
    private String login;
    private PerfilUsuario perfil;
    private String token;

    public LoginResponseDTO(Usuario usuario, String token) {
        this.id = usuario.getId();
        this.login = usuario.getLogin();
        this.perfil = usuario.getPerfil();
        this.token = token;
    }

    public Long getId() {
        return id;
    }

    public String getLogin() {
        return login;
    }

    public PerfilUsuario getPerfil() {
        return perfil;
    }

    public String getToken() {
        return token;
    }
}
