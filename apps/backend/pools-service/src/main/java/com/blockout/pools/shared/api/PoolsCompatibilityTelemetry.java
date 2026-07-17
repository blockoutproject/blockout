package com.blockout.pools.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.pools.shared.api.v2.PoolsProblemFactory;
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
public class PoolsCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(PoolsCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/pools";
    private static final String V2_PREFIX = "/api/v2/pools";

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
        String requestId = PoolsProblemFactory.resolveRequestId(request);
        request.setAttribute(PoolsProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Pools compatibility request", keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"), keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/pools", "");
        String method = request.getMethod();
        if (path.isEmpty()) {
            return switch (method) {
                case "GET" -> "POOL-01";
                case "POST" -> "POOL-03";
                default -> "POOL-UNKNOWN";
            };
        }
        if (path.matches("/[^/]+/followers/increment") && method.equals("POST")) {
            return "POOL-06";
        }
        if (path.matches("/[^/]+/followers/decrement") && method.equals("POST")) {
            return "POOL-07";
        }
        if (path.matches("/[^/]+")) {
            return switch (method) {
                case "GET" -> "POOL-02";
                case "PUT" -> "POOL-04";
                case "DELETE" -> "POOL-05";
                default -> "POOL-UNKNOWN";
            };
        }
        return "POOL-UNKNOWN";
    }
}
