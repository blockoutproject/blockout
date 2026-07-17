package com.blockout.competitions.shared.api.v2;

import com.blockout.competitions.association.api.v2.CompetitionAssociationsV2Controller;
import com.blockout.competitions.association.api.v2.CompetitionStatisticsV2Controller;
import com.blockout.competitions.exceptions.CompetitionAssociationNotFoundException;
import com.blockout.competitions.lifecycle.api.v2.CompetitionLifecycleV2Controller;
import com.blockout.competitions.ranking.api.v2.CompetitionRankingsV2Controller;
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
@RestControllerAdvice(assignableTypes = {
        CompetitionAssociationsV2Controller.class,
        CompetitionStatisticsV2Controller.class,
        CompetitionRankingsV2Controller.class,
        CompetitionLifecycleV2Controller.class
})
@RequiredArgsConstructor
public class CompetitionV2ExceptionHandler {

    private final CompetitionProblemFactory problems;

    @ExceptionHandler(CompetitionAssociationNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(
            CompetitionAssociationNotFoundException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.NOT_FOUND, "competition_association_not_found",
                exception.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleConflict(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.CONFLICT, "competition_association_conflict",
                "The association conflicts with existing data.", request);
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            IllegalStateException.class,
            ConstraintViolationException.class,
            MethodValidationException.class,
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class
    })
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
