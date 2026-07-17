package com.blockout.notifications.shared.api.v2;

import com.blockout.notifications.inbox.api.v2.NotificationInboxV2Controller;
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

/** Translates canonical inbox failures without changing the isolated v1 error map. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = NotificationInboxV2Controller.class)
@RequiredArgsConstructor
public class NotificationsV2ExceptionHandler {

    private final NotificationsProblemFactory problems;

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
