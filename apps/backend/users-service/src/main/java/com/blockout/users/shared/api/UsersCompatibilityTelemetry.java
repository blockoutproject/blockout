package com.blockout.users.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.shared.api.v2.UsersProblemFactory;
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

/** Records payload-free v1/v2 account compatibility evidence. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class UsersCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(UsersCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/users";
    private static final String V2_PREFIX = "/api/v2/users";

    /** Filters only users-service routes in the approved coexistence matrix. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.equals(V1_PREFIX)
                && !path.equals(V2_PREFIX)
                && !path.startsWith(V1_PREFIX + "/")
                && !path.startsWith(V2_PREFIX + "/");
    }

    /** Records route version, operation family, status, latency, and safe request identifier. */
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = UsersProblemFactory.resolveRequestId(request);
        request.setAttribute(UsersProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Users compatibility request",
                    keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    /** Maps account/profile routes to their frozen MRG-301 operation identifiers. */
    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/users", "");
        String method = request.getMethod();
        if (path.equals("/me")) {
            return switch (method) {
                case "GET" -> "USER-02";
                case "PUT" -> "USER-04";
                case "DELETE" -> "USER-05";
                default -> "USER-UNKNOWN";
            };
        }
        if (path.matches("/internal/[^/]+/assign-default-role")) {
            return "USER-06";
        }
        if (path.matches("/[^/]+")) {
            return switch (method) {
                case "GET" -> "USER-01";
                case "PUT" -> "USER-03";
                default -> "USER-UNKNOWN";
            };
        }
        if (path.matches("/[^/]+/favorites")) {
            return "USER-07";
        }
        if (path.equals("/favorites/follow")) {
            return "POST".equals(method) ? "USER-08" : "USER-09";
        }
        return "USER-UNKNOWN";
    }
}
