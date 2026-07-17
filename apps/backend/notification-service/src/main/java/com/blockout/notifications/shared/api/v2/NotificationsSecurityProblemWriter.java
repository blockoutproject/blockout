package com.blockout.notifications.shared.api.v2;

import com.blockout.shared.model.ProblemDetail;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Writes canonical v2 security failures while delegating v1 to Spring's retained handlers. */
@Component
@RequiredArgsConstructor
public class NotificationsSecurityProblemWriter implements AuthenticationEntryPoint, AccessDeniedHandler {

    private static final String V2_PREFIX = "/api/v2/notifications";

    private final ObjectMapper objectMapper;
    private final NotificationsProblemFactory problems;
    private final BearerTokenAuthenticationEntryPoint legacyAuthenticationEntryPoint =
            new BearerTokenAuthenticationEntryPoint();
    private final BearerTokenAccessDeniedHandler legacyAccessDeniedHandler = new BearerTokenAccessDeniedHandler();

    /** Writes v2 authentication Problem Details or delegates to the retained v1 handler. */
    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        if (!isV2(request)) {
            legacyAuthenticationEntryPoint.commence(request, response, exception);
            return;
        }
        write(problems.response(
                HttpStatus.UNAUTHORIZED, "authentication_required", "Authentication is required.", request),
                response);
    }

    /** Writes v2 authorization Problem Details or delegates to the retained v1 handler. */
    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception) throws IOException, ServletException {
        if (!isV2(request)) {
            legacyAccessDeniedHandler.handle(request, response, exception);
            return;
        }
        write(problems.response(HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.", request), response);
    }

    /** Identifies the canonical notification-service route family. */
    private boolean isV2(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals(V2_PREFIX) || path.startsWith(V2_PREFIX + "/");
    }

    /** Serializes one canonical response through the application mapper. */
    private void write(ResponseEntity<ProblemDetail> problem, HttpServletResponse response) throws IOException {
        response.setStatus(problem.getStatusCode().value());
        problem.getHeaders().forEach(
                (name, values) -> values.forEach(value -> response.addHeader(name, value)));
        objectMapper.writeValue(response.getOutputStream(), problem.getBody());
    }
}
