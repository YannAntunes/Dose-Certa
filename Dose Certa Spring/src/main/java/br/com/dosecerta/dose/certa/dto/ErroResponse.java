package br.com.dosecerta.dose.certa.dto;

public class ErroResponse {

    private String tipo;
    private String mensagem;
    private boolean alerta;

    public ErroResponse(String tipo, String mensagem, boolean alerta) {
        this.tipo = tipo;
        this.mensagem = mensagem;
        this.alerta = alerta;
    }

    public String getTipo() {
        return tipo;
    }

    public String getMensagem() {
        return mensagem;
    }

    public boolean isAlerta() {
        return alerta;
    }
}
