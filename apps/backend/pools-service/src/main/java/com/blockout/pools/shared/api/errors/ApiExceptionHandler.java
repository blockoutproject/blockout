package com.blockout.pools.shared.api.errors;

import com.blockout.pools.pool.application.exceptions.PoolNotFoundException;
import org.slf4j.*;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.*;

/** Converts pools-service failures to stable ProblemDetail responses. */
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ApiProblemFactory factory;
    public ApiExceptionHandler(ApiProblemFactory factory) { this.factory = factory; }
    @ExceptionHandler(PoolNotFoundException.class)
    ResponseEntity<ProblemDetail> notFound(PoolNotFoundException exception) {
        return factory.response(HttpStatus.NOT_FOUND, "pool_not_found", exception.getMessage(), "Pool not found.");
    }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> forbidden(AccessDeniedException exception) {
        return factory.response(HttpStatus.FORBIDDEN, "access_denied", "Access denied.", "Access denied.");
    }
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ProblemDetail> unauthorized(AuthenticationException exception) {
        return factory.response(HttpStatus.UNAUTHORIZED, "authentication_required",
                "Authentication is required or invalid.", "Authentication is required or invalid.");
    }
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    ResponseEntity<ProblemDetail> badRequest(Exception exception) {
        return factory.response(HttpStatus.BAD_REQUEST, "invalid_request", exception.getMessage(), "Invalid request.");
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception exception) {
        LOGGER.error("Unhandled pools-service exception", exception);
        return factory.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error",
                "An internal error occurred.", "An internal error occurred.");
    }
}
