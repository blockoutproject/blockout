package com.blockout.users.exceptions;

import jakarta.servlet.http.HttpServletRequest;

import org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.account.application.UserIdentityProviderException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(
            ConflictException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.CONFLICT,
                request.getRequestURI());
    }

    @ExceptionHandler(CustomUserEmailAlreadyUsedException.class)
    public ResponseEntity<Map<String, Object>> handleEmailAlreadyUsed(
            CustomUserEmailAlreadyUsedException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.CONFLICT,
                request.getRequestURI());
    }

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

    @ExceptionHandler(CustomUserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(
            CustomUserNotFoundException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.NOT_FOUND,
                request.getRequestURI());
    }

    @ExceptionHandler(Auth0Exception.class)
    public ResponseEntity<Map<String, Object>> handleAuth0UserNotFound(
            Auth0Exception ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.UNAUTHORIZED,
                request.getRequestURI());
    }

    /** Preserves the v1 401 body after Auth0 becomes an isolated adapter. */
    @ExceptionHandler(UserIdentityProviderException.class)
    public ResponseEntity<Map<String, Object>> handleIdentityProvider(
            UserIdentityProviderException ex, HttpServletRequest request) {
        return buildErrorResponse(
                ex.getMessage(),
                HttpStatus.UNAUTHORIZED,
                request.getRequestURI());
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
                "Une erreur interne est survenue.",
                HttpStatus.INTERNAL_SERVER_ERROR,
                request.getRequestURI());
    }

    @ExceptionHandler({
            MaxUploadSizeExceededException.class,
            SizeLimitExceededException.class
    })
    public ResponseEntity<Map<String, Object>> handleFileTooLarge(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(
                "L’image est trop volumineuse. La taille maximale autorisée est de 5 Mo.",
                HttpStatus.PAYLOAD_TOO_LARGE,
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
