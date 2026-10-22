package br.com.dosecerta.dose.certa.controller;

public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
