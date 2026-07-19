package com.blockout.competitions.shared.api.errors;

import com.blockout.competitions.association.application.exceptions.CompetitionAssociationNotFoundException;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ApiProblemFactory problemFactory;

    @ExceptionHandler(CompetitionAssociationNotFoundException.class)
    ResponseEntity<ProblemDetail> handleNotFound(CompetitionAssociationNotFoundException exception) {
        return problemFactory.response(HttpStatus.NOT_FOUND, "competition_association_not_found", exception.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    ResponseEntity<ProblemDetail> handleBadRequest(Exception exception) {
        return problemFactory.response(HttpStatus.BAD_REQUEST, "invalid_request", exception.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception) {
        return problemFactory.response(HttpStatus.FORBIDDEN, "access_denied", "Access denied.");
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException exception) {
        return problemFactory.response(
                HttpStatus.UNAUTHORIZED, "authentication_required", "Authentication is required or invalid.");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpected(Exception exception) {
        LOGGER.error("Unhandled competition-service exception", exception);
        return problemFactory.response(
                HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error", "An internal error occurred.");
    }
}
