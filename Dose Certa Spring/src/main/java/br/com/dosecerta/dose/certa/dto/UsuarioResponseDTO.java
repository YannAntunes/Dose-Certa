package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;

public class UsuarioResponseDTO {

    private Long id;
    private String login;
    private PerfilUsuario perfil;

    public UsuarioResponseDTO(Usuario u) {
        this.id = u.getId();
        this.login = u.getLogin();
        this.perfil = u.getPerfil();
    }

    public Long getId() { return id; }
    public String getLogin() { return login; }
    public PerfilUsuario getPerfil() { return perfil; }
}
