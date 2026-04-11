package br.com.dosecerta.dose.certa.dto;

import br.com.dosecerta.dose.certa.entity.Paciente;

public class PacienteDTO {

    private Long id;
    private String nome;
    private String cpf;
    private double peso;
    private int idade;

    public PacienteDTO(Paciente paciente) {
        this.id = paciente.getId();
        this.nome = paciente.getNome();
        this.cpf = paciente.getCpf();
        this.peso = paciente.getPeso();
        this.idade = paciente.getIdade();
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
}
