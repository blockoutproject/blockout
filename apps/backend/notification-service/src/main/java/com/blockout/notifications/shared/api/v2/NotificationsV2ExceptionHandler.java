package com.blockout.notifications.shared.api.v2;

import com.blockout.notifications.inbox.api.v2.NotificationInboxV2Controller;
import com.blockout.notifications.inbox.api.v2.NotificationInboxMutationsV2Controller;
import com.blockout.notifications.push.api.v2.PushTokenV2Controller;
import com.blockout.notifications.user.application.CurrentUserNotFoundException;
import com.blockout.shared.model.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;

/** Translates canonical inbox failures without changing the isolated v1 error map. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {
        NotificationInboxV2Controller.class,
        NotificationInboxMutationsV2Controller.class,
        PushTokenV2Controller.class
})
@RequiredArgsConstructor
public class NotificationsV2ExceptionHandler {

    private final NotificationsProblemFactory problems;

    /** Maps an authenticated identity with no local Blockout user. */
    @ExceptionHandler(CurrentUserNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleMissingUser(
            CurrentUserNotFoundException exception,
            HttpServletRequest request) {
        return problems.response(HttpStatus.NOT_FOUND, "not_found", "The requested resource was not found.", request);
    }

    /** Preserves relevant downstream authentication, authorization, and absence statuses. */
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<ProblemDetail> handleDownstreamClientError(
            HttpClientErrorException exception,
            HttpServletRequest request) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        if (status == HttpStatus.UNAUTHORIZED) {
            return problems.response(status, "authentication_required", "Authentication is required.", request);
        }
        if (status == HttpStatus.FORBIDDEN) {
            return problems.response(status, "forbidden", "Access is forbidden.", request);
        }
        if (status == HttpStatus.NOT_FOUND) {
            return problems.response(status, "not_found", "The requested resource was not found.", request);
        }
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    /** Maps page and generated parameter validation failures. */
    @ExceptionHandler({
            IllegalArgumentException.class,
            ConstraintViolationException.class,
            MethodValidationException.class,
            MethodArgumentNotValidException.class
    })
    public ResponseEntity<ProblemDetail> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    /** Hides downstream and persistence details from canonical callers. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        return problems.response(
                HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "An internal error occurred.", request);
    }
}
