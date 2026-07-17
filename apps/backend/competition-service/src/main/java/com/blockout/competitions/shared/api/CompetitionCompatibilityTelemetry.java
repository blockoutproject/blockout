package com.blockout.competitions.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.competitions.shared.api.v2.CompetitionProblemFactory;
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
public class CompetitionCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/competitions";
    private static final String V2_PREFIX = "/api/v2/competitions";

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
        String requestId = CompetitionProblemFactory.resolveRequestId(request);
        request.setAttribute(CompetitionProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Competition compatibility request", keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"), keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/competitions", "");
        String method = request.getMethod();
        if (path.matches("/pools/[^/]+/teams/[^/]+/stats") && method.equals("PUT")) {
            return "COMP-07";
        }
        if (path.matches("/pools/[^/]+/teams/bulk-deactivate") && method.equals("PUT")) {
            return "COMP-04";
        }
        if (path.matches("/pools/[^/]+/teams/[^/]+") && method.equals("POST")) {
            return "COMP-01";
        }
        if (path.matches("/pools/[^/]+/teams") && method.equals("GET")) {
            return "COMP-02";
        }
        if (path.matches("/teams/[^/]+/pools-with-ranking") && method.equals("GET")) {
            return "COMP-08";
        }
        if (path.matches("/teams/[^/]+/pools") && method.equals("GET")) {
            return "COMP-03";
        }
        if (path.equals("/pools/bulk-deactivate") && method.equals("PUT")) {
            return "COMP-05";
        }
        if (path.equals("/clubs/bulk-deactivate") && method.equals("PUT")) {
            return "COMP-06";
        }
        return "COMP-UNKNOWN";
    }
}
