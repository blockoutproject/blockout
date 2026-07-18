package com.blockout.reports.report.infrastructure.discord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.reports.config.DiscordProperties;
import com.blockout.reports.report.application.ReportNotificationException;
import com.blockout.reports.report.application.ReportResult;
import java.net.URI;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class DiscordReportNotifierUnitTest {

    private static final String WEBHOOK = "https://discord.example/api/webhooks/secret-token";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doesNotForwardTheInboundBearerTokenToDiscord() {
        authenticate("inbound-secret");
        RestTemplate client = new DiscordHttpConfiguration().discordRestTemplate(new RestTemplateBuilder());
        MockRestServiceServer server = MockRestServiceServer.bindTo(client).build();
        server.expect(request -> assertThat(request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION)).isNull())
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess());

        notifier(client).notifyCreated(result());

        server.verify();
    }

    @Test
    void keepsWebhookCredentialsOutOfProviderLogsAndErrors() {
        RestTemplate client = new DiscordHttpConfiguration().discordRestTemplate(new RestTemplateBuilder());
        MockRestServiceServer server = MockRestServiceServer.bindTo(client).build();
        server.expect(request -> assertThat(request.getURI()).isEqualTo(URI.create(WEBHOOK)))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("invalid webhook"));
        Logger logger = (Logger) LoggerFactory.getLogger(DiscordReportNotifier.class);
        ListAppender<ILoggingEvent> events = new ListAppender<>();
        events.start();
        logger.addAppender(events);

        try {
            assertThatThrownBy(() -> notifier(client).notifyCreated(result()))
                    .isInstanceOf(ReportNotificationException.class)
                    .hasMessage("Report notification failed");
            assertThat(events.list).extracting(ILoggingEvent::getFormattedMessage)
                    .allMatch(message -> !message.contains(WEBHOOK) && !message.contains("secret-token"));
            server.verify();
        } finally {
            logger.detachAppender(events);
            events.stop();
        }
    }

    private DiscordReportNotifier notifier(RestTemplate client) {
        DiscordProperties properties = new DiscordProperties();
        properties.setWebhookUrl(WEBHOOK);
        return new DiscordReportNotifier(client, properties);
    }

    private ReportResult result() {
        return new ReportResult(42, URI.create("https://github.example/issues/42"), "Wrong score", 99L, "OPEN");
    }

    private void authenticate(String token) {
        Jwt jwt = Jwt.withTokenValue(token).header("alg", "RS256").claim("sub", "reporter").build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new JwtAuthenticationToken(jwt));
        SecurityContextHolder.setContext(context);
    }
}
