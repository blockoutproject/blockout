package com.blockout.users.shared.api.v2;

import com.blockout.shared.model.ProblemDetail;
import com.blockout.users.account.api.v2.UserAccountV2Controller;
import com.blockout.users.account.application.UserIdentityProviderException;
import com.blockout.users.favorite.api.v2.UserFavoriteV2Controller;
import com.blockout.users.exceptions.ConflictException;
import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Translates canonical account/profile failures without changing the legacy error body. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {UserAccountV2Controller.class, UserFavoriteV2Controller.class})
@RequiredArgsConstructor
public class UsersV2ExceptionHandler {

    private final UsersProblemFactory problems;

    /** Maps missing local accounts to the stable not-found code. */
    @ExceptionHandler(CustomUserNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(
            CustomUserNotFoundException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.NOT_FOUND, "user_not_found", exception.getMessage(), request);
    }

    /** Maps retained pseudo and email conflicts to the stable conflict code. */
    @ExceptionHandler({ConflictException.class, CustomUserEmailAlreadyUsedException.class})
    public ResponseEntity<ProblemDetail> handleConflict(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.CONFLICT, "user_conflict", exception.getMessage(), request);
    }

    /** Preserves the current Auth0 failure status while returning canonical Problem Details. */
    @ExceptionHandler(UserIdentityProviderException.class)
    public ResponseEntity<ProblemDetail> handleIdentityFailure(
            UserIdentityProviderException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.UNAUTHORIZED, "identity_provider_error", exception.getMessage(), request);
    }

    /** Maps invalid generated, multipart, and explicit image-intent input to a bad request. */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ConstraintViolationException.class,
            MethodValidationException.class, MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class})
    public ResponseEntity<ProblemDetail> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    /** Maps configured multipart limits to the canonical payload-too-large response. */
    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    public ResponseEntity<ProblemDetail> handlePayloadTooLarge(Exception exception, HttpServletRequest request) {
        return problems.response(
                HttpStatus.PAYLOAD_TOO_LARGE, "payload_too_large", "The request payload is too large.", request);
    }

    /** Maps method-security failures that reach the controller advice. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.", request);
    }

    /** Hides unexpected implementation and provider details behind the canonical internal error. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        return problems.response(
                HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "An internal error occurred.", request);
    }
}
