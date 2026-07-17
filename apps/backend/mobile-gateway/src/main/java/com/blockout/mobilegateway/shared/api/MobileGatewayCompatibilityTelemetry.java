package com.blockout.mobilegateway.shared.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

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

/** Records payload-free v1/v2 evidence for migrated mobile workflows. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MobileGatewayCompatibilityTelemetry extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(MobileGatewayCompatibilityTelemetry.class);
    private static final String V1_PREFIX = "/api/v1/mobile/";
    private static final String V2_PREFIX = "/api/v2/mobile/";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!(path.startsWith(V1_PREFIX) || path.startsWith(V2_PREFIX)) || path.contains("/config/legal/")) {
            return true;
        }
        return operationId(request) == null;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = MobileGatewayProblemFactory.requestId(request);
        request.setAttribute(MobileGatewayProblemFactory.REQUEST_ID_ATTRIBUTE, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            LOGGER.info("Mobile gateway compatibility request",
                    keyValue("operationId", operationId(request)),
                    keyValue("apiVersion", request.getRequestURI().startsWith(V2_PREFIX) ? "v2" : "v1"),
                    keyValue("callerCohort", request.getRequestURI().contains("/secure/") ? "authenticated" : "public"),
                    keyValue("status", status),
                    keyValue("statusClass", status / 100 + "xx"),
                    keyValue("latencyMs", (System.nanoTime() - startedAt) / 1_000_000),
                    keyValue("requestId", requestId));
        }
    }

    String operationId(HttpServletRequest request) {
        String path = request.getRequestURI().replaceFirst("^/api/v[12]/mobile/", "");
        String method = request.getMethod();
        if ("GET".equals(method) && path.equals("public/config/app-status")) {
            return "BFF-P-02";
        }
        if ("GET".equals(method) && path.matches("public/ffvb/pdf/[^/]+")) {
            return "BFF-P-06";
        }
        if ("GET".equals(method) && path.equals("public/matches")) {
            return "BFF-P-08";
        }
        if ("GET".equals(method) && path.matches("public/matches/[^/]+")) {
            return "BFF-P-07";
        }
        if ("GET".equals(method) && path.matches("public/clubs/[^/]+")) {
            return "BFF-P-01";
        }
        if ("GET".equals(method) && path.equals("public/pools/by-ids")) {
            return "BFF-P-10";
        }
        if ("GET".equals(method) && path.matches("public/pools/[^/]+")) {
            return "BFF-P-09";
        }
        if ("GET".equals(method) && path.equals("public/teams/by-ids")) {
            return "BFF-P-17";
        }
        if ("GET".equals(method) && path.matches("public/teams/by-club/[^/]+")) {
            return "BFF-P-16";
        }
        if ("GET".equals(method) && path.matches("public/teams/[^/]+")) {
            return "BFF-P-15";
        }
        if ("GET".equals(method) && path.equals("public/config/divisions")) {
            return "BFF-P-03";
        }
        if ("GET".equals(method) && path.matches("public/config/divisions/[^/]+")) {
            return "BFF-P-04";
        }
        if ("POST".equals(method) && path.equals("public/reports")) {
            return "BFF-P-11";
        }
        if ("GET".equals(method) && path.equals("public/search/clubs")) {
            return "BFF-P-12";
        }
        if ("GET".equals(method) && path.equals("public/search/teams")) {
            return "BFF-P-13";
        }
        if ("GET".equals(method) && path.equals("public/search/pools")) {
            return "BFF-P-14";
        }
        if ("PUT".equals(method) && path.equals("secure/config/app-status")) {
            return "BFF-S-02";
        }
        if ("PUT".equals(method) && path.matches("secure/clubs/[^/]+")) {
            return "BFF-S-01";
        }
        if ("PUT".equals(method) && path.matches("secure/pools/[^/]+")) {
            return "BFF-S-27";
        }
        if ("PUT".equals(method) && path.matches("secure/teams/[^/]+")) {
            return "BFF-S-28";
        }
        if ("POST".equals(method) && path.equals("secure/config/divisions")) {
            return "BFF-S-03";
        }
        if (path.matches("secure/config/divisions/[^/]+")) {
            return "PUT".equals(method) ? "BFF-S-04" : "DELETE".equals(method) ? "BFF-S-05" : null;
        }
        if (path.equals("secure/config/raw-divisions")) {
            return "POST".equals(method) ? "BFF-S-06" : "GET".equals(method) ? "BFF-S-08" : null;
        }
        if (path.matches("secure/config/raw-divisions/[^/]+")) {
            return "GET".equals(method) ? "BFF-S-09" : "PUT".equals(method) ? "BFF-S-10" : null;
        }
        if ("PUT".equals(method) && path.matches("secure/config/scrapers/[^/]+/enabled")) {
            return "BFF-S-11";
        }
        if ("GET".equals(method) && path.equals("secure/config/scrapers/status")) {
            return "BFF-S-12";
        }
        if (path.matches("secure/matches/[^/]+/live-link")) {
            return "POST".equals(method) ? "BFF-S-13" : "DELETE".equals(method) ? "BFF-S-14" : null;
        }
        if ("POST".equals(method) && path.matches("secure/matches/[^/]+/live-link/report")) {
            return "BFF-S-15";
        }
        if ("GET".equals(method) && path.matches("secure/matches/[^/]+/live-links")) {
            return "BFF-S-16";
        }
        if ("GET".equals(method) && path.equals("secure/matches/live-moderation")) {
            return "BFF-S-17";
        }
        if ("POST".equals(method) && path.matches("secure/matches/live-links/[^/]+/approve")) {
            return "BFF-S-18";
        }
        if ("POST".equals(method) && path.matches("secure/matches/live-links/[^/]+/reject")) {
            return "BFF-S-19";
        }
        if ("POST".equals(method) && path.matches("secure/matches/live-links/[^/]+/reactivate")) {
            return "BFF-S-20";
        }
        if ("GET".equals(method) && path.equals("secure/notifications")) {
            return "BFF-S-21";
        }
        if ("GET".equals(method) && path.equals("secure/notifications/unread-count")) {
            return "BFF-S-22";
        }
        if ("POST".equals(method) && path.matches("secure/notifications/[^/]+/read")) {
            return "BFF-S-23";
        }
        if ("POST".equals(method) && path.matches("secure/notifications/[^/]+/opened")) {
            return "BFF-S-24";
        }
        if ("DELETE".equals(method) && path.matches("secure/notifications/[^/]+")) {
            return "BFF-S-25";
        }
        if ("POST".equals(method) && path.matches("secure/notifications/users/[^/]+/push-tokens")) {
            return "BFF-S-26";
        }
        if (path.equals("secure/users/me")) {
            return "PUT".equals(method) ? "BFF-S-30" : "DELETE".equals(method) ? "BFF-S-31" : null;
        }
        if ("PUT".equals(method) && path.matches("secure/users/[^/]+")) {
            return "BFF-S-29";
        }
        if (path.equals("secure/favorites/follow")) {
            return "POST".equals(method) ? "BFF-S-32" : "DELETE".equals(method) ? "BFF-S-33" : null;
        }
        return null;
    }
}
