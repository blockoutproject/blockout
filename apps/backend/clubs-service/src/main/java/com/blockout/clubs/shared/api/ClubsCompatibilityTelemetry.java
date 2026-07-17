package com.blockout.clubs.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.clubs.shared.api.v2.ClubsProblemFactory;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ClubsCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubsCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/clubs";
    private static final String V2_PREFIX = "/api/v2/clubs";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.equals(V1_PREFIX) && !path.equals(V2_PREFIX)
                && !path.startsWith(V1_PREFIX + "/") && !path.startsWith(V2_PREFIX + "/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = ClubsProblemFactory.resolveRequestId(request);
        request.setAttribute(ClubsProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Clubs compatibility request",
                    keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/clubs", "");
        String method = request.getMethod();
        if (path.isEmpty()) {
            return switch (method) {
                case "GET" -> "CLUB-01";
                case "POST" -> "CLUB-03";
                default -> "CLUB-UNKNOWN";
            };
        }
        if (path.matches("/[^/]+/logo")) {
            return "CLUB-06";
        }
        if (path.matches("/[^/]+")) {
            return switch (method) {
                case "GET" -> "CLUB-02";
                case "PUT" -> "CLUB-04";
                case "DELETE" -> "CLUB-05";
                default -> "CLUB-UNKNOWN";
            };
        }
        return "CLUB-UNKNOWN";
    }
}
