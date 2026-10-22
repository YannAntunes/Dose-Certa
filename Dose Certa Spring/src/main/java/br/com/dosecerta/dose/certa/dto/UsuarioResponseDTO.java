package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.StatusUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;

import java.time.LocalDateTime;

public class UsuarioResponseDTO {

    private Long id;
    private String login;
    private PerfilUsuario perfil;
    private StatusUsuario status;
    private PerfilUsuario perfilSolicitado;
    private LocalDateTime criadoEm;

    public UsuarioResponseDTO(Usuario u) {
        this.id = u.getId();
        this.login = u.getLogin();
        this.perfil = u.getPerfil();
        this.status = u.getStatus();
        this.perfilSolicitado = u.getPerfilSolicitado();
        this.criadoEm = u.getCriadoEm();
    }

    public Long getId() { return id; }
    public String getLogin() { return login; }
    public PerfilUsuario getPerfil() { return perfil; }
    public StatusUsuario getStatus() { return status != null ? status : StatusUsuario.ATIVO; }
    public PerfilUsuario getPerfilSolicitado() { return perfilSolicitado; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
}
