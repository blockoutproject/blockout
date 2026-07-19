package com.blockout.teams.shared.api.errors;

import com.blockout.teams.team.application.exceptions.TeamNotFoundException;
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

/** Converts teams-service failures to stable ProblemDetail responses. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ApiProblemFactory problemFactory;

    public ApiExceptionHandler(ApiProblemFactory problemFactory) {
        this.problemFactory = problemFactory;
    }

    @ExceptionHandler(TeamNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(TeamNotFoundException exception) {
        return problemFactory.response(HttpStatus.NOT_FOUND, "team_not_found", exception.getMessage(), "Team not found.");
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

    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    public ResponseEntity<ProblemDetail> handleFileTooLarge(Exception exception) {
        return problemFactory.response(HttpStatus.PAYLOAD_TOO_LARGE, "image_too_large",
                "The maximum image size is 5 MB.", "The maximum image size is 5 MB.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception) {
        LOGGER.error("Unhandled teams-service exception", exception);
        return problemFactory.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error",
                "An internal error occurred.", "An internal error occurred.");
    }
}
