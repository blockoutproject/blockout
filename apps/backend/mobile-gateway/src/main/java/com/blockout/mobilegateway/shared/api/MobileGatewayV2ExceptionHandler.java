package com.blockout.mobilegateway.shared.api;

import com.blockout.mobilegateway.configuration.runtime.api.MobileConfigurationV2Controller;
import com.blockout.mobilegateway.notification.api.MobileNotificationV2Controller;
import com.blockout.mobilegateway.report.api.MobileReportV2Controller;
import com.blockout.mobilegateway.search.api.MobileSearchV2Controller;
import com.blockout.mobilegateway.user.api.MobileUserV2Controller;
import com.blockout.shared.model.ProblemDetail;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {
        MobileConfigurationV2Controller.class,
        MobileNotificationV2Controller.class,
        MobileReportV2Controller.class,
        MobileSearchV2Controller.class,
        MobileUserV2Controller.class
})
@RequiredArgsConstructor
public class MobileGatewayV2ExceptionHandler {

    private final MobileGatewayProblemFactory problems;
    private final ObjectMapper objectMapper;

    @ExceptionHandler({
            ConstraintViolationException.class,
            MethodValidationException.class,
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class,
            ServletRequestBindingException.class,
            MethodArgumentTypeMismatchException.class,
            MultipartException.class
    })
    public ResponseEntity<ProblemDetail> invalidRequest(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.BAD_REQUEST, "invalid_request", "The request is invalid.", request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ProblemDetail> payloadTooLarge(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request) {
        return problems.response(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "payload_too_large",
                "The request payload exceeds the accepted operation limit.",
                request);
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
            String code = present(downstream.getCode()) ? downstream.getCode() : "downstream_error";
            String detail = present(downstream.getDetail())
                    ? downstream.getDetail()
                    : "A downstream service rejected the request.";
            String requestId = MobileGatewayProblemFactory.valid(downstream.getRequestId())
                    ? downstream.getRequestId()
                    : MobileGatewayProblemFactory.requestId(request);
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                    .header(MobileGatewayProblemFactory.REQUEST_ID_HEADER, requestId)
                    .body(problems.problem(status, code, detail, request.getRequestURI(), requestId));
        } catch (Exception ignored) {
            return problems.response(
                    status,
                    "downstream_error",
                    "A downstream service rejected the request.",
                    request);
        }
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ProblemDetail> unavailable(RestClientException exception, HttpServletRequest request) {
        return problems.response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "downstream_service_unavailable",
                "A downstream service is unavailable.",
                request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> unexpected(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "An internal error occurred.", request);
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }
}
