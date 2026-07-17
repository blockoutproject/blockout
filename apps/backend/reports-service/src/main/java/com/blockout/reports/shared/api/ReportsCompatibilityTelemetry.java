package com.blockout.reports.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.reports.shared.api.v2.ReportsProblemFactory;
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

/** Records payload-free v1/v2 report compatibility evidence. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReportsCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(ReportsCompatibilityTelemetry.class);
    private static final String V1_PATH = "/api/v1/reports";
    private static final String V2_PATH = "/api/v2/reports";

    /** Filters only the report operation in the approved coexistence matrix. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.equals(V1_PATH) && !path.equals(V2_PATH);
    }

    /** Records route version, operation ID, status, latency, and safe request identifier. */
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = ReportsProblemFactory.resolveRequestId(request);
        request.setAttribute(ReportsProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Reports compatibility request",
                    keyValue("operationId", "REPORT-01"),
                    keyValue("apiVersion", request.getRequestURI().equals(V2_PATH) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }
}
