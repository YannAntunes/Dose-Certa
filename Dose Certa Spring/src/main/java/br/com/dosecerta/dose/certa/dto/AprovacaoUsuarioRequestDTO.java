package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.StatusUsuario;

public class AprovacaoUsuarioRequestDTO {

    private PerfilUsuario perfil;
    private StatusUsuario status;

    public PerfilUsuario getPerfil() {
        return perfil;
    }

    public void setPerfil(PerfilUsuario perfil) {
        this.perfil = perfil;
    }

    public StatusUsuario getStatus() {
        return status;
    }

    public void setStatus(StatusUsuario status) {
        this.status = status;
    }
}
