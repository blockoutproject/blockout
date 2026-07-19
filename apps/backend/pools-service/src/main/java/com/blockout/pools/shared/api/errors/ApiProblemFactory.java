package com.blockout.pools.shared.api.errors;

import org.springframework.http.*;
import org.springframework.stereotype.Component;

/** Creates stable ProblemDetail responses for pools-service. */
@Component
public class ApiProblemFactory {
    public ResponseEntity<ProblemDetail> response(HttpStatus status, String code, String detail, String fallback) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(status.getReasonPhrase());
        problem.setDetail(detail == null || detail.isBlank() ? fallback : detail);
        problem.setProperty("code", code);
        return ResponseEntity.status(status).body(problem);
    }
}
