package com.blockout.mobilegateway.configuration.legal.api;

import com.blockout.shared.model.ProblemDetail;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = LegalDocumentV2Controller.class)
@RequiredArgsConstructor
public class LegalDocumentV2ExceptionHandler {

    private final LegalDocumentProblemFactory problems;
    private final ObjectMapper objectMapper;

    @ExceptionHandler({
            ConstraintViolationException.class,
            MethodValidationException.class,
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ProblemDetail> invalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    @ExceptionHandler(HttpStatusCodeException.class)
    public ResponseEntity<ProblemDetail> downstreamProblem(
            HttpStatusCodeException exception,
            HttpServletRequest request) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        try {
            ProblemDetail downstream = objectMapper.readValue(exception.getResponseBodyAsByteArray(), ProblemDetail.class);
            String code = downstream.getCode() == null || downstream.getCode().isBlank()
                    ? "downstream_error"
                    : downstream.getCode();
            String detail = downstream.getDetail() == null || downstream.getDetail().isBlank()
                    ? "The configuration service rejected the request."
                    : downstream.getDetail();
            String requestId = LegalDocumentProblemFactory.valid(downstream.getRequestId())
                    ? downstream.getRequestId()
                    : LegalDocumentProblemFactory.requestId(request);
            ProblemDetail body = problems.problem(status, code, detail, request.getRequestURI(), requestId);
            return ResponseEntity.status(status)
                    .contentType(org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON)
                    .header(LegalDocumentProblemFactory.REQUEST_ID_HEADER, requestId)
                    .body(body);
        } catch (Exception ignored) {
            return problems.response(
                    status,
                    "downstream_error",
                    "The configuration service rejected the request.",
                    request);
        }
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ProblemDetail> unavailable(RestClientException exception, HttpServletRequest request) {
        return problems.response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "config_service_unavailable",
                "The configuration service is unavailable.",
                request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> unexpected(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "An internal error occurred.", request);
    }
}
