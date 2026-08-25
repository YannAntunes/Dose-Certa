package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Medico;

public class MedicoResponseDTO {

    private Long id;
    private String nome;
    private Integer crm;
    private String estado;

    public MedicoResponseDTO(Medico m) {
        this.id = m.getId();
        this.nome = m.getNome();
        this.crm = m.getCrm();
        this.estado = m.getEstado();
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public Integer getCrm() { return crm; }
    public String getEstado() { return estado; }
}
