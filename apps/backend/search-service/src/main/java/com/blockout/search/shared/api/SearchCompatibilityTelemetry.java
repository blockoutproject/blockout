package com.blockout.search.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.search.shared.api.v2.SearchProblemFactory;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Records payload-free compatibility evidence for all three search operations. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SearchCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchCompatibilityTelemetry.class);
    private static final Map<String, String> OPERATIONS = Map.of(
            "/clubs", "SEARCH-01",
            "/teams", "SEARCH-02",
            "/pools", "SEARCH-03");

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return route(request) == null;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Route route = route(request);
        long startedAt = System.nanoTime();
        String requestId = SearchProblemFactory.resolveRequestId(request);
        request.setAttribute(SearchProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Search compatibility request",
                    keyValue("operationId", route.operationId()),
                    keyValue("apiVersion", route.apiVersion()),
                    keyValue("callerCohort", "internal"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    private Route route(HttpServletRequest request) {
        String path = request.getRequestURI();
        String version;
        String suffix;
        if (path.startsWith("/api/v1/search")) {
            version = "v1";
            suffix = path.substring("/api/v1/search".length());
        } else if (path.startsWith("/api/v2/search")) {
            version = "v2";
            suffix = path.substring("/api/v2/search".length());
        } else {
            return null;
        }
        String operationId = OPERATIONS.get(suffix);
        return operationId == null ? null : new Route(version, operationId);
    }

    private record Route(String apiVersion, String operationId) {
    }
}
