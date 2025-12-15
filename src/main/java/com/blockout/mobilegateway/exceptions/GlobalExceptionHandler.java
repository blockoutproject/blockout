package com.blockout.mobilegateway.exceptions;

import com.blockout.mobilegateway.utils.ApiErrorUtils;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InconsistentStateException.class)
    public ResponseEntity<Map<String, Object>> handleInconsistentState(
            InconsistentStateException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR,
                request.getRequestURI());
    }

    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<Map<String, Object>> handleHttpClientError(
            HttpClientErrorException ex, HttpServletRequest request) {

        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null)
            status = HttpStatus.BAD_REQUEST;

        String extracted = ApiErrorUtils.extractMessage(ex.getResponseBodyAsString());

        String fallback = switch (status) {
            case UNAUTHORIZED -> "Authentication is required or invalid.";
            case FORBIDDEN -> "Access denied: you do not have the required permissions.";
            case NOT_FOUND -> "The requested resource was not found.";
            default -> "Client error (" + status.value() + ") occurred when calling an external service.";
        };

        String message = (extracted != null && !extracted.isBlank()) ? extracted : fallback;

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

    @ExceptionHandler(ServletRequestBindingException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            ServletRequestBindingException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.BAD_REQUEST,
                request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(
            Exception ex, HttpServletRequest request) {
        return buildErrorResponse(
                "An internal server error occurred.",
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