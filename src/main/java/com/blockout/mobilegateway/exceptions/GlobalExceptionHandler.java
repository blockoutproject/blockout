package com.blockout.mobilegateway.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return buildErrorResponse(
                "Accès refusé : vous n’avez pas les permissions nécessaires.",
                HttpStatus.FORBIDDEN,
                request.getRequestURI());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(
            AuthenticationException ex, HttpServletRequest request) {
        return buildErrorResponse(
                "Authentification requise ou invalide.",
                HttpStatus.UNAUTHORIZED,
                request.getRequestURI());
    }
    @ExceptionHandler(DivisionNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleDivisionNotFound(
            DivisionNotFoundException ex, HttpServletRequest request) {
        ex.printStackTrace();
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND,
                request.getRequestURI());
    }

    @ExceptionHandler(PoolNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handlePoolNotFound(
            PoolNotFoundException ex, HttpServletRequest request) {
        ex.printStackTrace();
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND,
                request.getRequestURI());
    }

    @ExceptionHandler(MatchNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleMatchNotFound(
            MatchNotFoundException ex, HttpServletRequest request) {
        ex.printStackTrace();
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND,
                request.getRequestURI());
    }

    @ExceptionHandler(TeamNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleTeamNotFound(
            TeamNotFoundException ex, HttpServletRequest request) {
        ex.printStackTrace();
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND,
                request.getRequestURI());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {
        ex.printStackTrace();
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.BAD_REQUEST,
                request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(
            Exception ex, HttpServletRequest request) {
        ex.printStackTrace();
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
                "path", path
        ));
    }
}