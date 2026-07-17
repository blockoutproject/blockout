package com.blockout.mobilegateway.configuration.legal.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

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
    private static final String V1_PUBLIC = "/api/v1/mobile/public/config/legal/";
    private static final String V1_SECURE = "/api/v1/mobile/secure/config/legal/";
    private static final String V2_PUBLIC = "/api/v2/mobile/public/config/legal/";
    private static final String V2_SECURE = "/api/v2/mobile/secure/config/legal/";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        boolean legalPath = path.startsWith(V1_PUBLIC)
                || path.startsWith(V1_SECURE)
                || path.startsWith(V2_PUBLIC)
                || path.startsWith(V2_SECURE);
        return !legalPath || !(HttpMethod.GET.matches(request.getMethod()) || HttpMethod.PUT.matches(request.getMethod()));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = LegalDocumentProblemFactory.requestId(request);
        request.setAttribute(LegalDocumentProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info(
                    "Mobile legal document compatibility request",
                    keyValue("operationId", HttpMethod.GET.matches(request.getMethod()) ? "BFF-P-05" : "BFF-S-07"),
                    keyValue("apiVersion", request.getRequestURI().startsWith("/api/v2/") ? "v2" : "v1"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }
}
