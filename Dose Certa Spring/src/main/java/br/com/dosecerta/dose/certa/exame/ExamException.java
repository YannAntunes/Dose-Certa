package br.com.dosecerta.dose.certa.exame;

import org.springframework.http.HttpStatus;

/** Erro de negocio do modulo de exames, com status HTTP, codigo estavel e indicacao de recuperabilidade. */
public class ExamException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final boolean recoverable;

    public ExamException(HttpStatus status, String code, String message, boolean recoverable) {
        super(message);
        this.status = status;
        this.code = code;
        this.recoverable = recoverable;
    }

    public ExamException(HttpStatus status, String code, String message) {
        this(status, code, message, false);
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public boolean isRecoverable() { return recoverable; }
}
