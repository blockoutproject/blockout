package com.blockout.workersearch.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<Map<String, Object>> handleHttpClientError(
            HttpClientErrorException ex, HttpServletRequest request) {

        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.BAD_REQUEST;
        }

        String message = switch (status) {
            case UNAUTHORIZED -> "Authentification requise ou invalide.";
            case FORBIDDEN -> "Accès refusé : vous n’avez pas les permissions nécessaires.";
            case NOT_FOUND -> ex.getMessage();
            default -> "Erreur client (" + status.value() + ") lors de l’appel à un service distant.";
        };

        return buildErrorResponse(message, status, request.getRequestURI());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.BAD_REQUEST,
                request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(
            Exception ex, HttpServletRequest request) {
        return buildErrorResponse(
                "Une erreur interne est survenue.",
                HttpStatus.INTERNAL_SERVER_ERROR,
                request.getRequestURI());
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(
            String message,
            HttpStatus status,
            String path) {

        return ResponseEntity.status(status).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message,
                "path", path));
    }
}