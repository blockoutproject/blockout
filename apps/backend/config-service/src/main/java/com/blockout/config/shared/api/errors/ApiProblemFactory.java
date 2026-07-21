package com.blockout.config.shared.api.errors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Creates stable ProblemDetail responses for config-service.
 */
@Component
public class ApiProblemFactory {

    /**
     * Creates a normalized problem response.
     */
    public ResponseEntity<ProblemDetail> response(
        HttpStatus status, String code, String detail, String fallbackDetail) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(status.getReasonPhrase());
        problem.setDetail(detail == null || detail.isBlank() ? fallbackDetail : detail);
        problem.setProperty("code", code);
        return ResponseEntity.status(status).body(problem);
    }
}
