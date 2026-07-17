package com.blockout.search.shared.api.v2;

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

/** Writes v2 security Problem Details and delegates v1 to the retained bearer handlers. */
@Component
@RequiredArgsConstructor
public class SearchSecurityProblemWriter implements AuthenticationEntryPoint, AccessDeniedHandler {

    private static final String V2_PATH = "/api/v2/search";

    private final ObjectMapper objectMapper;
    private final SearchProblemFactory problems;
    private final BearerTokenAuthenticationEntryPoint legacyAuthentication = new BearerTokenAuthenticationEntryPoint();
    private final BearerTokenAccessDeniedHandler legacyAccessDenied = new BearerTokenAccessDeniedHandler();

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        if (!isV2(request)) {
            legacyAuthentication.commence(request, response, exception);
            return;
        }
        write(problems.response(
                HttpStatus.UNAUTHORIZED, "authentication_required", "Authentication is required.", request), response);
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception) throws IOException, ServletException {
        if (!isV2(request)) {
            legacyAccessDenied.handle(request, response, exception);
            return;
        }
        write(problems.response(HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.", request), response);
    }

    private boolean isV2(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals(V2_PATH) || path.startsWith(V2_PATH + "/");
    }

    private void write(ResponseEntity<ProblemDetail> problem, HttpServletResponse response) throws IOException {
        response.setStatus(problem.getStatusCode().value());
        problem.getHeaders().forEach(
                (name, values) -> values.forEach(value -> response.addHeader(name, value)));
        objectMapper.writeValue(response.getOutputStream(), problem.getBody());
    }
}
