package br.com.dosecerta.dose.certa.dto;

public class PacienteRequestDTO {

    private String nome;
    private String cpf;
    private double peso;
    private int idade;
    private String tipoDocumento;
    private String paisOrigem;

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public double getPeso() {
        return peso;
    }

    public void setPeso(double peso) {
        this.peso = peso;
    }

    public int getIdade() {
        return idade;
    }

    public void setIdade(int idade) {
        this.idade = idade;
    }

    public String getTipoDocumento() {
        return tipoDocumento;
    }

    public void setTipoDocumento(String tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public String getPaisOrigem() {
        return paisOrigem;
    }

    public void setPaisOrigem(String paisOrigem) {
        this.paisOrigem = paisOrigem;
    }

    public br.com.dosecerta.dose.certa.entity.Paciente toEntity() {
        br.com.dosecerta.dose.certa.entity.Paciente paciente = new br.com.dosecerta.dose.certa.entity.Paciente();
        paciente.setNome(nome);
        paciente.setCpf(cpf);
        paciente.setPeso(peso);
        paciente.setIdade(idade);
        paciente.setTipoDocumento(tipoDocumento);
        paciente.setPaisOrigem(paisOrigem);
        return paciente;
    }
}
