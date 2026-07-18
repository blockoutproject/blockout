package com.blockout.config.legal.api.v2;

import com.blockout.config.legal.application.LegalDocumentNotFoundException;
import com.blockout.config.shared.api.v2.ConfigProblemFactory;
import com.blockout.shared.model.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = LegalDocumentV2Controller.class)
@RequiredArgsConstructor
public class LegalDocumentV2ExceptionHandler {

    private final ConfigProblemFactory problems;

    @ExceptionHandler(LegalDocumentNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(
            LegalDocumentNotFoundException exception,
            HttpServletRequest request) {
        return problems.response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "legal_document_not_found",
                "The legal document could not be found.",
                request);
    }

    @ExceptionHandler({
            ConstraintViolationException.class,
            MethodValidationException.class,
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ProblemDetail> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        return problems.response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "internal_error",
                "An internal error occurred.",
                request);
    }
}
