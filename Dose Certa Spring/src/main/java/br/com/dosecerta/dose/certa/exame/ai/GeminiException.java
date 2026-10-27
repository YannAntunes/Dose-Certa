package br.com.dosecerta.dose.certa.exame.ai;

/** Falha na chamada ao provedor de IA. As mensagens nunca contem chave nem conteudo clinico. */
public class GeminiException extends RuntimeException {

    public enum Kind { TIMEOUT, RATE_LIMIT, PROVIDER_ERROR, INVALID_ENVELOPE }

    private final Kind kind;
    private final boolean recoverable;

    public GeminiException(Kind kind, String message, boolean recoverable) {
        super(message);
        this.kind = kind;
        this.recoverable = recoverable;
    }

    public Kind getKind() { return kind; }
    public boolean isRecoverable() { return recoverable; }
}
