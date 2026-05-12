package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Paciente;

public class PacienteDTO {

    private Long id;
    private String nome;
    private String cpf;
    private double peso;
    private int idade;
    private String tipoDocumento;
    private String paisOrigem;

    public PacienteDTO() {}

    public PacienteDTO(Paciente paciente) {
        this.id = paciente.getId();
        this.nome = paciente.getNome();
        this.cpf = paciente.getCpf();
        this.peso = paciente.getPeso();
        this.idade = paciente.getIdade();
        this.tipoDocumento = paciente.getTipoDocumento();
        this.paisOrigem = paciente.getPaisOrigem();
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getCpf() {
        return cpf;
    }

    public double getPeso() {
        return peso;
    }

    public int getIdade() {
        return idade;
    }

    public String getTipoDocumento() {
        return tipoDocumento;
    }

    public String getPaisOrigem() {
        return paisOrigem;
    }

    public void setTipoDocumento(String tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public void setPaisOrigem(String paisOrigem) {
        this.paisOrigem = paisOrigem;
    }
}
