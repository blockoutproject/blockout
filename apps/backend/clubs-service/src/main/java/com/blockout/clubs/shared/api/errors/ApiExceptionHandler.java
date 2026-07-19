package com.blockout.clubs.shared.api.errors;

import com.blockout.clubs.club.application.exceptions.ClubNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ClubNotFoundException.class)
    ResponseEntity<Map<String, Object>> handleNotFound(
            ClubNotFoundException exception,
            HttpServletRequest request) {
        return response(exception.getMessage(), HttpStatus.NOT_FOUND, request.getRequestURI());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException exception,
            HttpServletRequest request) {
        return response("Access denied.", HttpStatus.FORBIDDEN, request.getRequestURI());
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Map<String, Object>> handleAuthentication(
            AuthenticationException exception,
            HttpServletRequest request) {
        return response("Authentication is required or invalid.", HttpStatus.UNAUTHORIZED, request.getRequestURI());
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    ResponseEntity<Map<String, Object>> handleBadRequest(Exception exception, HttpServletRequest request) {
        return response(exception.getMessage(), HttpStatus.BAD_REQUEST, request.getRequestURI());
    }

    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    ResponseEntity<Map<String, Object>> handleFileTooLarge(Exception exception, HttpServletRequest request) {
        return response("The maximum image size is 5 MB.", HttpStatus.PAYLOAD_TOO_LARGE, request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> handleUnexpected(Exception exception, HttpServletRequest request) {
        return response("An internal error occurred.", HttpStatus.INTERNAL_SERVER_ERROR, request.getRequestURI());
    }

    private ResponseEntity<Map<String, Object>> response(String message, HttpStatus status, String path) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message,
                "path", path));
    }
}
