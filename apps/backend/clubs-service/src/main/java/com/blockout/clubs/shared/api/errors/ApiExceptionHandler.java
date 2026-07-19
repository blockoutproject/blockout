package com.blockout.clubs.shared.api.errors;

import com.blockout.clubs.club.application.exceptions.ClubNotFoundException;
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
 * Converts clubs-service exceptions to stable ProblemDetail responses.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final String INTERNAL_ERROR_DETAIL = "An internal error occurred.";

    private final ApiProblemFactory problemFactory;

    /**
     * Creates the exception handler with its ProblemDetail factory.
     *
     * @param problemFactory factory for stable API errors.
     */
    public ApiExceptionHandler(ApiProblemFactory problemFactory) {
        this.problemFactory = problemFactory;
    }

    /**
     * Converts a missing Club into the stable not-found contract.
     */
    @ExceptionHandler(ClubNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ClubNotFoundException exception) {
        return problemFactory.response(
                HttpStatus.NOT_FOUND,
                "club_not_found",
                exception.getMessage(),
                "Club not found.");
    }

    /**
     * Converts an authorization rejection without exposing security details.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception) {
        return problemFactory.response(
                HttpStatus.FORBIDDEN,
                "access_denied",
                "Access denied.",
                "Access denied.");
    }

    /**
     * Converts a missing or invalid authentication into the stable unauthorized contract.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException exception) {
        return problemFactory.response(
                HttpStatus.UNAUTHORIZED,
                "authentication_required",
                "Authentication is required or invalid.",
                "Authentication is required or invalid.");
    }

    /**
     * Converts malformed application or request input into the stable bad-request contract.
     */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    public ResponseEntity<ProblemDetail> handleBadRequest(Exception exception) {
        return problemFactory.response(
                HttpStatus.BAD_REQUEST,
                "invalid_request",
                exception.getMessage(),
                "The request is invalid.");
    }

    /**
     * Converts rejected multipart uploads into the stable payload-too-large contract.
     */
    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    public ResponseEntity<ProblemDetail> handleFileTooLarge(Exception exception) {
        return problemFactory.response(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "image_too_large",
                "The maximum image size is 5 MB.",
                "The maximum image size is 5 MB.");
    }

    /**
     * Logs unexpected failures and returns a non-sensitive server error.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception) {
        LOGGER.error("Unhandled clubs-service exception", exception);
        return problemFactory.response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "internal_server_error",
                INTERNAL_ERROR_DETAIL,
                INTERNAL_ERROR_DETAIL);
    }
}
