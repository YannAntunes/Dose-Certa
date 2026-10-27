package br.com.dosecerta.dose.certa.exame.web;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.web.ExamDtos.ErrorDto;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.time.LocalDateTime;

/**
 * Tratamento de erros do modulo de exames. Precede o handler generico existente apenas para os tipos listados
 * (o handler antigo continua responsavel pelo restante).
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ExamExceptionHandler {

    @ExceptionHandler(ExamException.class)
    public ResponseEntity<ErrorDto> handle(ExamException e) {
        return build(e.getStatus(), e.getCode(), e.getMessage(), e.isRecoverable());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorDto> handleTooLarge(MaxUploadSizeExceededException e) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "O arquivo excede o tamanho maximo permitido.", false);
    }

    @ExceptionHandler({MissingServletRequestPartException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorDto> handleBadRequest(Exception e) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Requisicao invalida: parametro ausente ou malformado.", false);
    }

    private static ResponseEntity<ErrorDto> build(HttpStatus status, String code, String message, boolean recoverable) {
        return ResponseEntity.status(status)
                .body(new ErrorDto(status.value(), code, message, recoverable, LocalDateTime.now()));
    }
}
