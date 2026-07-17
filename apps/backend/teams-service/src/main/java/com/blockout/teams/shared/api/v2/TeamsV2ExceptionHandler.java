package com.blockout.teams.shared.api.v2;

import com.blockout.shared.model.ProblemDetail;
import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.team.api.v2.TeamClubDiscoveryV2Controller;
import com.blockout.teams.team.api.v2.TeamFollowersV2Controller;
import com.blockout.teams.team.api.v2.TeamV2Controller;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {
        TeamV2Controller.class, TeamClubDiscoveryV2Controller.class, TeamFollowersV2Controller.class
})
@RequiredArgsConstructor
public class TeamsV2ExceptionHandler {

    private final TeamsProblemFactory problems;

    @ExceptionHandler(TeamNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(TeamNotFoundException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.NOT_FOUND, "team_not_found", exception.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleConflict(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.CONFLICT, "team_conflict", "The team conflicts with existing data.",
                request);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, ConstraintViolationException.class,
            MethodValidationException.class, MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class})
    public ResponseEntity<ProblemDetail> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    public ResponseEntity<ProblemDetail> handlePayloadTooLarge(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.PAYLOAD_TOO_LARGE, "payload_too_large",
                "The request payload is too large.", request);
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
