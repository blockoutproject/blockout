package com.blockout.users.shared.api.errors;

import com.blockout.users.user.application.exceptions.IdentityProviderException;
import com.blockout.users.user.application.exceptions.UserConflictException;
import com.blockout.users.user.application.exceptions.UserEmailAlreadyUsedException;
import com.blockout.users.user.application.exceptions.UserNotFoundException;
import lombok.RequiredArgsConstructor;
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

@RestControllerAdvice
@RequiredArgsConstructor
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ApiProblemFactory problemFactory;

    @ExceptionHandler(UserNotFoundException.class)
    ResponseEntity<ProblemDetail> handleNotFound(UserNotFoundException exception) {
        return problemFactory.response(HttpStatus.NOT_FOUND, "user_not_found", exception.getMessage());
    }

    @ExceptionHandler({UserConflictException.class, UserEmailAlreadyUsedException.class})
    ResponseEntity<ProblemDetail> handleConflict(RuntimeException exception) {
        return problemFactory.response(HttpStatus.CONFLICT, "user_conflict", exception.getMessage());
    }

    @ExceptionHandler(IdentityProviderException.class)
    ResponseEntity<ProblemDetail> handleIdentityProvider(IdentityProviderException exception) {
        return problemFactory.response(HttpStatus.UNAUTHORIZED, "identity_provider_error", exception.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ServletRequestBindingException.class})
    ResponseEntity<ProblemDetail> handleBadRequest(Exception exception) {
        return problemFactory.response(HttpStatus.BAD_REQUEST, "invalid_request", exception.getMessage());
    }

    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    ResponseEntity<ProblemDetail> handleFileTooLarge(Exception exception) {
        return problemFactory.response(
                HttpStatus.PAYLOAD_TOO_LARGE, "image_too_large", "The maximum image size is 5 MB.");
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
        LOGGER.error("Unhandled users-service exception", exception);
        return problemFactory.response(
                HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error", "An internal error occurred.");
    }
}
