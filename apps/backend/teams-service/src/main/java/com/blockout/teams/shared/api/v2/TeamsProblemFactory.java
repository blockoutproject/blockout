package com.blockout.teams.shared.api.v2;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.shared.model.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class TeamsProblemFactory {

    private static final int MAX_REQUEST_ID_LENGTH = 255;
    private static final Logger LOGGER = LoggerFactory.getLogger(TeamsProblemFactory.class);
    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String REQUEST_ID_ATTRIBUTE = TeamsProblemFactory.class.getName() + ".requestId";

    public ResponseEntity<ProblemDetail> response(
            HttpStatus status, String code, String detail, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        ProblemDetail problem = new ProblemDetail(status.getReasonPhrase(), status.value(), code)
                .type("https://blockout.app/problems/" + code).detail(detail)
                .instance(request.getRequestURI()).requestId(requestId);
        LOGGER.info("Teams v2 problem", keyValue("problemCode", code), keyValue("status", status.value()),
                keyValue("requestId", requestId));
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .header(REQUEST_ID_HEADER, requestId).body(problem);
    }

    public static String resolveRequestId(HttpServletRequest request) {
        Object assigned = request.getAttribute(REQUEST_ID_ATTRIBUTE);
        if (assigned instanceof String requestId && isValid(requestId)) {
            return requestId;
        }
        String supplied = request.getHeader(REQUEST_ID_HEADER);
        return isValid(supplied) ? supplied : UUID.randomUUID().toString();
    }

    private static boolean isValid(String requestId) {
        return requestId != null && !requestId.isBlank() && requestId.length() <= MAX_REQUEST_ID_LENGTH;
    }
}
