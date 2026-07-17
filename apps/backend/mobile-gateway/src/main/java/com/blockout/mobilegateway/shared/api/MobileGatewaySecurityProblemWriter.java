package com.blockout.mobilegateway.shared.api;

import com.blockout.shared.model.ProblemDetail;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class MobileGatewaySecurityProblemWriter implements AuthenticationEntryPoint, AccessDeniedHandler {

    private static final String V2_PREFIX = "/api/v2/mobile/";
    private final ObjectMapper objectMapper;
    private final MobileGatewayProblemFactory problems;
    private final BearerTokenAuthenticationEntryPoint legacyAuthentication = new BearerTokenAuthenticationEntryPoint();
    private final BearerTokenAccessDeniedHandler legacyAccessDenied = new BearerTokenAccessDeniedHandler();

    public MobileGatewaySecurityProblemWriter(ObjectMapper objectMapper, MobileGatewayProblemFactory problems) {
        this.objectMapper = objectMapper;
        this.problems = problems;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        if (!request.getRequestURI().startsWith(V2_PREFIX)) {
            legacyAuthentication.commence(request, response, exception);
            return;
        }
        write(request, response, HttpStatus.UNAUTHORIZED, "unauthorized", "Authentication is required.");
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception) throws IOException, ServletException {
        if (!request.getRequestURI().startsWith(V2_PREFIX)) {
            legacyAccessDenied.handle(request, response, exception);
            return;
        }
        write(request, response, HttpStatus.FORBIDDEN, "forbidden", "Access is forbidden.");
    }

    private void write(
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String code,
            String detail) throws IOException {
        String requestId = MobileGatewayProblemFactory.requestId(request);
        ProblemDetail problem = problems.problem(status, code, detail, request.getRequestURI(), requestId);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader(MobileGatewayProblemFactory.REQUEST_ID_HEADER, requestId);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}
