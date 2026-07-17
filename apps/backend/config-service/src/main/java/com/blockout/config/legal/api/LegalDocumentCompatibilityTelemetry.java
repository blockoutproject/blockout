package com.blockout.config.legal.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.shared.api.v2.ConfigProblemFactory;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LegalDocumentCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(LegalDocumentCompatibilityTelemetry.class);
    private static final String V1_PATH = "/api/v1/config/legal/";
    private static final String V2_PATH = "/api/v2/config/legal/";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        boolean legalPath = path.startsWith(V1_PATH) || path.startsWith(V2_PATH);
        boolean legalMethod = HttpMethod.GET.matches(request.getMethod())
                || HttpMethod.PUT.matches(request.getMethod());
        return !legalPath || !legalMethod;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = requestId(request);
        request.setAttribute(ConfigProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info(
                    "Legal document compatibility request",
                    keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PATH) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private String operationId(HttpServletRequest request) {
        return "GET".equals(request.getMethod()) ? "CFG-08" : "CFG-09";
    }

    private String requestId(HttpServletRequest request) {
        return ConfigProblemFactory.resolveRequestId(request);
    }
}
