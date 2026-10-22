package br.com.dosecerta.dose.certa.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String login;

    @Column(nullable = false)
    private String senha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PerfilUsuario perfil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusUsuario status = StatusUsuario.ATIVO;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil_solicitado")
    private PerfilUsuario perfilSolicitado;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm = LocalDateTime.now();

    // Construtor exigido pelo JPA
    public Usuario() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public PerfilUsuario getPerfil() {
        return perfil;
    }

    public void setPerfil(PerfilUsuario perfil) {
        this.perfil = perfil;
    }

    public StatusUsuario getStatus() {
        return status != null ? status : StatusUsuario.ATIVO;
    }

    public void setStatus(StatusUsuario status) {
        this.status = status != null ? status : StatusUsuario.ATIVO;
    }

    public PerfilUsuario getPerfilSolicitado() {
        return perfilSolicitado;
    }

    public void setPerfilSolicitado(PerfilUsuario perfilSolicitado) {
        this.perfilSolicitado = perfilSolicitado;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}
