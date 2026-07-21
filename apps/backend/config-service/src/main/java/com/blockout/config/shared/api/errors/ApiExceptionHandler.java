package com.blockout.config.shared.api.errors;

import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Converts config-service failures to stable ProblemDetail responses.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ApiProblemFactory problemFactory;

    /**
     * Creates the handler with its response factory.
     */
    public ApiExceptionHandler(ApiProblemFactory problemFactory) {
        this.problemFactory = problemFactory;
    }

    /**
     * Converts missing configuration resources to a stable 404 response.
     */
    @ExceptionHandler(ConfigResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ConfigResourceNotFoundException exception) {
        return problemFactory.response(HttpStatus.NOT_FOUND, exception.getCode(), exception.getMessage(),
            "Configuration resource not found.");
    }

    /**
     * Converts authorization rejection to a stable 403 response.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception) {
        return problemFactory.response(HttpStatus.FORBIDDEN, "access_denied", "Access denied.", "Access denied.");
    }

    /**
     * Converts missing or invalid authentication to a stable 401 response.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException exception) {
        return problemFactory.response(HttpStatus.UNAUTHORIZED, "authentication_required",
            "Authentication is required or invalid.", "Authentication is required or invalid.");
    }

    /**
     * Converts malformed input to a stable 400 response.
     */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    public ResponseEntity<ProblemDetail> handleBadRequest(Exception exception) {
        return problemFactory.response(HttpStatus.BAD_REQUEST, "invalid_request", exception.getMessage(),
            "The request is invalid.");
    }

    /**
     * Converts oversized multipart uploads to a stable 413 response.
     */
    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    public ResponseEntity<ProblemDetail> handleFileTooLarge(Exception exception) {
        return problemFactory.response(HttpStatus.PAYLOAD_TOO_LARGE, "image_too_large",
            "The maximum image size is 5 MB.", "The maximum image size is 5 MB.");
    }

    /**
     * Logs unexpected failures without exposing implementation details.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception) {
        LOGGER.error("Unhandled config-service exception", exception);
        return problemFactory.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error",
            "An internal error occurred.", "An internal error occurred.");
    }
}
