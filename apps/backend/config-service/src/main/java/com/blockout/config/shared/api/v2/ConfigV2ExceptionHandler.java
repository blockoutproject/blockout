package com.blockout.config.shared.api.v2;

import com.blockout.config.appstatus.api.v2.AppStatusV2Controller;
import com.blockout.config.division.api.v2.DivisionV2Controller;
import com.blockout.config.appstatus.application.AppStatusNotFoundException;
import com.blockout.config.division.application.DivisionNotFoundException;
import com.blockout.config.rawmapping.application.RawDivisionMappingNotFoundException;
import com.blockout.config.scraperstatus.application.ScraperNotFoundException;
import com.blockout.config.rawmapping.api.v2.RawDivisionMappingV2Controller;
import com.blockout.config.scraperstatus.api.v2.ScraperStatusV2Controller;
import com.blockout.shared.model.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
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
        AppStatusV2Controller.class,
        DivisionV2Controller.class,
        RawDivisionMappingV2Controller.class,
        ScraperStatusV2Controller.class
})
@RequiredArgsConstructor
public class ConfigV2ExceptionHandler {

    private final ConfigProblemFactory problems;

    @ExceptionHandler({
            AppStatusNotFoundException.class,
            DivisionNotFoundException.class,
            RawDivisionMappingNotFoundException.class,
            ScraperNotFoundException.class
    })
    public ResponseEntity<ProblemDetail> handleNotFound(RuntimeException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.NOT_FOUND, "resource_not_found", exception.getMessage(), request);
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

    @ExceptionHandler({MaxUploadSizeExceededException.class, SizeLimitExceededException.class})
    public ResponseEntity<ProblemDetail> handlePayloadTooLarge(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.PAYLOAD_TOO_LARGE, "payload_too_large",
                "The request payload is too large.", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        return problems.response(HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        return problems.response(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error",
                "An internal error occurred.", request);
    }
}
