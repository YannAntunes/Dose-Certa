package br.com.dosecerta.dose.certa.dto;

public class EnfermeiroRequestDTO {

    private String nome;
    private String coren;
    private String estado;

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCoren() {
        return coren;
    }

    public void setCoren(String coren) {
        this.coren = coren;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public br.com.dosecerta.dose.certa.entity.Enfermeiro toEntity() {
        br.com.dosecerta.dose.certa.entity.Enfermeiro enfermeiro = new br.com.dosecerta.dose.certa.entity.Enfermeiro();
        enfermeiro.setNome(nome);
        enfermeiro.setCoren(coren);
        enfermeiro.setEstado(estado);
        return enfermeiro;
    }
}
