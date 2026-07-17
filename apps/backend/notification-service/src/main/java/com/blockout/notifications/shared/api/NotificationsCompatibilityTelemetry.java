package com.blockout.notifications.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.shared.api.v2.NotificationsProblemFactory;
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

/** Records payload-free v1/v2 notification compatibility evidence. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class NotificationsCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationsCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/notifications";
    private static final String V2_PREFIX = "/api/v2/notifications";

    /** Filters only notification-service routes in the approved coexistence matrix. */
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
        String requestId = NotificationsProblemFactory.resolveRequestId(request);
        request.setAttribute(NotificationsProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Notifications compatibility request",
                    keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", "internal"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    /** Maps notification routes to their frozen MRG-301 operation identifiers. */
    private String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/notifications", "");
        String method = request.getMethod();
        if (path.isEmpty() && method.equals("GET")) {
            return "NOTIF-01";
        }
        if (path.equals("/unread-count") && method.equals("GET")) {
            return "NOTIF-02";
        }
        if (path.matches("/[^/]+/read") && method.equals("POST")) {
            return "NOTIF-03";
        }
        if (path.matches("/[^/]+/opened") && method.equals("POST")) {
            return "NOTIF-04";
        }
        if (path.matches("/[^/]+") && method.equals("DELETE")) {
            return "NOTIF-05";
        }
        if (path.matches("/users/[^/]+/push-tokens") && method.equals("POST")) {
            return "NOTIF-06";
        }
        return "NOTIF-UNKNOWN";
    }
}
