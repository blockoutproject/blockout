package com.blockout.teams.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.teams.shared.api.v2.TeamsProblemFactory;
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
public class TeamsCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(TeamsCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/teams";
    private static final String V2_PREFIX = "/api/v2/teams";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.equals(V1_PREFIX) && !path.equals(V2_PREFIX)
                && !path.startsWith(V1_PREFIX + "/") && !path.startsWith(V2_PREFIX + "/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = TeamsProblemFactory.resolveRequestId(request);
        request.setAttribute(TeamsProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Teams compatibility request", keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"), keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/teams", "");
        String method = request.getMethod();
        if (path.isEmpty()) {
            return switch (method) {
                case "GET" -> "TEAM-01";
                case "POST" -> "TEAM-03";
                default -> "TEAM-UNKNOWN";
            };
        }
        if (path.equals("/club-ids") && method.equals("GET")) {
            return "TEAM-06";
        }
        if (path.matches("/[^/]+/followers/increment") && method.equals("POST")) {
            return "TEAM-07";
        }
        if (path.matches("/[^/]+/followers/decrement") && method.equals("POST")) {
            return "TEAM-08";
        }
        if (path.matches("/[^/]+")) {
            return switch (method) {
                case "GET" -> "TEAM-02";
                case "PUT" -> "TEAM-04";
                case "DELETE" -> "TEAM-05";
                default -> "TEAM-UNKNOWN";
            };
        }
        return "TEAM-UNKNOWN";
    }
}
