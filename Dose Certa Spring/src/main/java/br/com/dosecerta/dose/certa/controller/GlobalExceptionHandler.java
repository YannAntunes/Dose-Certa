package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.ErrorResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 🔴 Erros de regra de negócio / validação
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponseDTO> handleIllegalArgument(
            IllegalArgumentException ex
    ) {
        ErrorResponseDTO error = new ErrorResponseDTO(
                HttpStatus.BAD_REQUEST.value(),
                "REGRA_CLINICA",
                ex.getMessage()
        );

        return ResponseEntity.badRequest().body(error);
    }

    // 🔴 Erro genérico inesperado
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGeneric(Exception ex) {
        log.error("Erro inesperado no servidor", ex);

        ErrorResponseDTO error = new ErrorResponseDTO(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "ERRO_INTERNO",
                "Erro inesperado no servidor. Tente novamente."
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(RegraClinicaException.class)
    public ResponseEntity<ErrorResponseDTO> handleRegraClinica(RegraClinicaException ex) {
        return ResponseEntity
                .badRequest()
                .body(new ErrorResponseDTO(
                        400,
                        "REGRA_CLINICA",
                        ex.getMessage()
                ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDTO> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("Erro de integridade relacional", ex);
        return ResponseEntity
                .badRequest()
                .body(new ErrorResponseDTO(
                        400,
                        "REGRA_CLINICA",
                        "Este registro não pode ser excluído porque possui dados vinculados (ex: consultas no histórico)."
                ));
    }
}
