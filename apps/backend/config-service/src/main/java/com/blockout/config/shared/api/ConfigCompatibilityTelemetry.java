package com.blockout.config.shared.api;

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
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ConfigCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(ConfigCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/config/";
    private static final String V2_PREFIX = "/api/v2/config/";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        boolean configPath = path.startsWith(V1_PREFIX) || path.startsWith(V2_PREFIX);
        return !configPath || path.contains("/config/legal/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = ConfigProblemFactory.resolveRequestId(request);
        request.setAttribute(ConfigProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Config compatibility request",
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
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/config/", "");
        String method = request.getMethod();
        if (path.equals("app-status")) {
            return "GET".equals(method) ? "CFG-01" : "CFG-02";
        }
        if (path.equals("divisions")) {
            return switch (method) {
                case "GET" -> "CFG-03";
                case "POST" -> "CFG-05";
                default -> "CFG-UNKNOWN";
            };
        }
        if (path.matches("divisions/[^/]+")) {
            return switch (method) {
                case "GET" -> "CFG-04";
                case "PUT" -> "CFG-06";
                case "DELETE" -> "CFG-07";
                default -> "CFG-UNKNOWN";
            };
        }
        if (path.equals("raw-divisions")) {
            return "POST".equals(method) ? "CFG-10" : "CFG-11";
        }
        if (path.matches("raw-divisions/[^/]+")) {
            return "PUT".equals(method) ? "CFG-13" : "CFG-12";
        }
        if (path.equals("scrapers/status")) {
            return "CFG-16";
        }
        if (path.matches("scrapers/[^/]+/enabled")) {
            return "CFG-15";
        }
        if (path.matches("scrapers/[^/]+/status")) {
            return "CFG-14";
        }
        return "CFG-UNKNOWN";
    }
}
