package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Medico;

/**
 * FIX C-06: DTO de entrada para criação/atualização de médicos.
 * Substitui o uso direto da entidade JPA no controller.
 */
public class MedicoRequestDTO {

    private String nome;
    private Integer crm;
    private String estado;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public Integer getCrm() { return crm; }
    public void setCrm(Integer crm) { this.crm = crm; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Medico toEntity() {
        Medico m = new Medico();
        m.setNome(nome);
        m.setCrm(crm);
        m.setEstado(estado);
        return m;
    }
}
