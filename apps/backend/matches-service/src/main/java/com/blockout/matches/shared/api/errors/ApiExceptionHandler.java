package com.blockout.matches.shared.api.errors;

import com.blockout.matches.match.application.exceptions.MatchNotFoundException;
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

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ApiProblemFactory problemFactory;

    public ApiExceptionHandler(ApiProblemFactory problemFactory) {
        this.problemFactory = problemFactory;
    }

    @ExceptionHandler(MatchNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(MatchNotFoundException exception) {
        return problemFactory.response(HttpStatus.NOT_FOUND, "match_not_found", exception.getMessage(),
                "Match not found.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception) {
        return problemFactory.response(HttpStatus.FORBIDDEN, "access_denied", "Access denied.", "Access denied.");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException exception) {
        return problemFactory.response(HttpStatus.UNAUTHORIZED, "authentication_required",
                "Authentication is required or invalid.", "Authentication is required or invalid.");
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    public ResponseEntity<ProblemDetail> handleBadRequest(Exception exception) {
        return problemFactory.response(HttpStatus.BAD_REQUEST, "invalid_request", exception.getMessage(),
                "The request is invalid.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception) {
        LOGGER.error("Unhandled matches-service exception", exception);
        return problemFactory.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error",
                "An internal error occurred.", "An internal error occurred.");
    }
}
