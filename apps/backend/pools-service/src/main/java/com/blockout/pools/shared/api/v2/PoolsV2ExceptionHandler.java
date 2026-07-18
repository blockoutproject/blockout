package com.blockout.pools.shared.api.v2;

import com.blockout.pools.pool.application.PoolNotFoundException;
import com.blockout.pools.pool.api.v2.PoolFollowersV2Controller;
import com.blockout.pools.pool.api.v2.PoolV2Controller;
import com.blockout.shared.model.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {PoolV2Controller.class, PoolFollowersV2Controller.class})
@RequiredArgsConstructor
public class PoolsV2ExceptionHandler {

    private final PoolsProblemFactory problems;

    @ExceptionHandler(PoolNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(PoolNotFoundException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.NOT_FOUND, "pool_not_found", exception.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleConflict(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.CONFLICT, "pool_conflict", "The pool conflicts with existing data.",
                request);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ConstraintViolationException.class,
            MethodValidationException.class, MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class})
    public ResponseEntity<ProblemDetail> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error",
                "An internal error occurred.", request);
    }
}
