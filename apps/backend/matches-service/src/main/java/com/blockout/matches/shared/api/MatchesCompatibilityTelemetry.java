package com.blockout.matches.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.shared.api.v2.MatchesProblemFactory;
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
public class MatchesCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchesCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/matches";
    private static final String V2_PREFIX = "/api/v2/matches";

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
        String requestId = MatchesProblemFactory.resolveRequestId(request);
        request.setAttribute(MatchesProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Matches compatibility request", keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"), keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/matches", "");
        String method = request.getMethod();
        if (path.isEmpty() && method.equals("GET")) {
            return "MATCH-01";
        }
        if (path.equals("/day-groups") && method.equals("GET")) {
            return "MATCH-02";
        }
        if (path.matches("/\\d+") && method.equals("GET")) {
            return "MATCH-03";
        }
        if (path.isEmpty() && method.equals("POST")) {
            return "MATCH-04";
        }
        if (path.matches("/\\d+") && method.equals("PUT")) {
            return "MATCH-05";
        }
        if (path.matches("/pools/[^/]+/bulk-deactivate") && method.equals("PUT")) {
            return "MATCH-06";
        }
        if (path.matches("/\\d+/live-links") && method.equals("GET")) {
            return "MATCH-08";
        }
        if (path.matches("/\\d+/live-link") && method.equals("POST")) {
            return "MATCH-09";
        }
        if (path.matches("/\\d+/live-link") && method.equals("DELETE")) {
            return "MATCH-10";
        }
        return "MATCH-DEFERRED";
    }
}
