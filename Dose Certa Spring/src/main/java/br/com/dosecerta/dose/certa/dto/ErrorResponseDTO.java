package br.com.dosecerta.dose.certa.dto;

import java.time.LocalDateTime;

public class ErrorResponseDTO {

    private int status;
    private String error;
    private String message;
    private LocalDateTime timestamp;

    public ErrorResponseDTO(int status, String error, String message) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    public int getStatus() {
        return status;
    }

    public String getError() {
        return error;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}
