package com.blockout.mobilegateway.shared.api;

import com.blockout.shared.model.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class MobileGatewayProblemFactory {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String REQUEST_ID_ATTRIBUTE = MobileGatewayProblemFactory.class.getName() + ".requestId";
    private static final int MAX_REQUEST_ID_LENGTH = 255;

    public ResponseEntity<ProblemDetail> response(
            HttpStatus status,
            String code,
            String detail,
            HttpServletRequest request) {
        String requestId = requestId(request);
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .header(REQUEST_ID_HEADER, requestId)
                .body(problem(status, code, detail, request.getRequestURI(), requestId));
    }

    public ProblemDetail problem(
            HttpStatus status,
            String code,
            String detail,
            String instance,
            String requestId) {
        return new ProblemDetail(status.getReasonPhrase(), status.value(), code)
                .type("https://blockout.app/problems/" + code)
                .detail(detail)
                .instance(instance)
                .requestId(requestId);
    }

    public static String requestId(HttpServletRequest request) {
        Object assigned = request.getAttribute(REQUEST_ID_ATTRIBUTE);
        if (assigned instanceof String requestId && valid(requestId)) {
            return requestId;
        }
        String supplied = request.getHeader(REQUEST_ID_HEADER);
        return valid(supplied) ? supplied : UUID.randomUUID().toString();
    }

    public static boolean valid(String requestId) {
        return requestId != null && !requestId.isBlank() && requestId.length() <= MAX_REQUEST_ID_LENGTH;
    }
}
