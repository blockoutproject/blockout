package com.blockout.clubs.shared.api.errors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Creates stable ProblemDetail responses for the clubs-service API boundary.
 */
@Component
public class ApiProblemFactory {

    /**
     * Creates a ProblemDetail response with a stable machine-readable code.
     *
     * @param status HTTP status to expose.
     * @param code stable machine-readable code.
     * @param detail human-readable detail.
     * @param fallbackDetail detail used when the provided value is blank.
     * @return response carrying the normalized problem.
     */
    public ResponseEntity<ProblemDetail> response(
            HttpStatus status,
            String code,
            String detail,
            String fallbackDetail) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(status.getReasonPhrase());
        problem.setDetail(resolveDetail(detail, fallbackDetail));
        problem.setProperty("code", code);
        return ResponseEntity.status(status).body(problem);
    }

    /**
     * Prevents a blank exception message from producing a blank public error detail.
     */
    private String resolveDetail(String detail, String fallbackDetail) {
        return detail == null || detail.isBlank() ? fallbackDetail : detail;
    }
}
