package com.blockout.mobilegateway.shared.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockHttpServletRequest;

class MobileGatewayCompatibilityTelemetryTest {

    private final MobileGatewayCompatibilityTelemetry telemetry = new MobileGatewayCompatibilityTelemetry();

    @ParameterizedTest
    @MethodSource("routes")
    void assignsEveryMigratedOperationExactly(String method, String path, String operationId) {
        assertThat(telemetry.operationId(new MockHttpServletRequest(method, path))).isEqualTo(operationId);
    }

    @Test
    void leavesTheSeparateLegalPilotOutsideThisTelemetrySlice() {
        var request = new MockHttpServletRequest("GET", "/api/v2/mobile/public/config/legal/privacy");

        assertThat(telemetry.shouldNotFilter(request)).isTrue();
    }

    @Test
    void doesNotMisclassifyAnUnsupportedMethodAsLegacyTraffic() {
        var request = new MockHttpServletRequest("GET", "/api/v2/mobile/secure/favorites/follow");

        assertThat(telemetry.shouldNotFilter(request)).isTrue();
    }

    private static Stream<Arguments> routes() {
        return Stream.of(
                route("GET", "public/clubs/club-1", "BFF-P-01"),
                route("GET", "public/config/app-status", "BFF-P-02"),
                route("GET", "public/config/divisions", "BFF-P-03"),
                route("GET", "public/config/divisions/1", "BFF-P-04"),
                route("GET", "public/ffvb/pdf/token", "BFF-P-06"),
                route("GET", "public/matches/1", "BFF-P-07"),
                route("GET", "public/matches", "BFF-P-08"),
                route("POST", "public/reports", "BFF-P-11"),
                route("GET", "public/search/clubs", "BFF-P-12"),
                route("GET", "public/search/teams", "BFF-P-13"),
                route("GET", "public/search/pools", "BFF-P-14"),
                route("GET", "public/pools/1", "BFF-P-09"),
                route("GET", "public/pools/by-ids", "BFF-P-10"),
                route("GET", "public/teams/1", "BFF-P-15"),
                route("GET", "public/teams/by-club/club-1", "BFF-P-16"),
                route("GET", "public/teams/by-ids", "BFF-P-17"),
                route("PUT", "secure/clubs/club-1", "BFF-S-01"),
                route("PUT", "secure/config/app-status", "BFF-S-02"),
                route("POST", "secure/config/divisions", "BFF-S-03"),
                route("PUT", "secure/config/divisions/1", "BFF-S-04"),
                route("DELETE", "secure/config/divisions/1", "BFF-S-05"),
                route("POST", "secure/config/raw-divisions", "BFF-S-06"),
                route("GET", "secure/config/raw-divisions", "BFF-S-08"),
                route("GET", "secure/config/raw-divisions/1", "BFF-S-09"),
                route("PUT", "secure/config/raw-divisions/1", "BFF-S-10"),
                route("PUT", "secure/config/scrapers/FFVB/enabled", "BFF-S-11"),
                route("GET", "secure/config/scrapers/status", "BFF-S-12"),
                route("POST", "secure/matches/1/live-link", "BFF-S-13"),
                route("DELETE", "secure/matches/1/live-link", "BFF-S-14"),
                route("POST", "secure/matches/1/live-link/report", "BFF-S-15"),
                route("GET", "secure/matches/1/live-links", "BFF-S-16"),
                route("GET", "secure/matches/live-moderation", "BFF-S-17"),
                route("POST", "secure/matches/live-links/1/approve", "BFF-S-18"),
                route("POST", "secure/matches/live-links/1/reject", "BFF-S-19"),
                route("POST", "secure/matches/live-links/1/reactivate", "BFF-S-20"),
                route("GET", "secure/notifications", "BFF-S-21"),
                route("GET", "secure/notifications/unread-count", "BFF-S-22"),
                route("POST", "secure/notifications/1/read", "BFF-S-23"),
                route("POST", "secure/notifications/1/opened", "BFF-S-24"),
                route("DELETE", "secure/notifications/1", "BFF-S-25"),
                route("POST", "secure/notifications/users/1/push-tokens", "BFF-S-26"),
                route("PUT", "secure/pools/1", "BFF-S-27"),
                route("PUT", "secure/teams/1", "BFF-S-28"),
                route("PUT", "secure/users/auth0|user", "BFF-S-29"),
                route("PUT", "secure/users/me", "BFF-S-30"),
                route("DELETE", "secure/users/me", "BFF-S-31"),
                route("POST", "secure/favorites/follow", "BFF-S-32"),
                route("DELETE", "secure/favorites/follow", "BFF-S-33"));
    }

    private static Arguments route(String method, String suffix, String operationId) {
        return Arguments.of(method, "/api/v2/mobile/" + suffix, operationId);
    }
}
