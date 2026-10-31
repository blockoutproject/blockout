package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.backend.support.application.SupportCaseDraft;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.restclient.observation.ObservationRestClientCustomizer;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.client.observation.DefaultClientRequestObservationConvention;
import org.springframework.web.client.RestClient;

/** Exercises native logs and HTTP observations without exporting private provider details. */
@DisplayName("Support diagnostics privacy")
class SupportDiagnosticsTest {
  @Test
  @DisplayName("Keeps private GitHub and webhook destinations out of native HTTP observations")
  void excludesPrivateHttpDestinations() throws Exception {
    // Given
    List<String> observations = new CopyOnWriteArrayList<>();
    ObservationRegistry registry = ObservationRegistry.create();
    registry
        .observationConfig()
        .observationHandler(
            new ObservationHandler<Observation.Context>() {
              /** {@inheritDoc} */
              @Override
              public boolean supportsContext(Observation.Context context) {
                return true;
              }

              /** {@inheritDoc} */
              @Override
              public void onStop(Observation.Context context) {
                observations.add(
                    context
                        .getLowCardinalityKeyValues()
                        .and(context.getHighCardinalityKeyValues())
                        .toString());
              }
            });
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          byte[] body =
              "{\"number\":17,\"labels\":[{\"name\":\"complete\"}],\"id\":\"fictional-message\"}"
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getRequestBody().readAllBytes();
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(
              exchange.getRequestURI().getPath().endsWith("/issues") ? 201 : 200, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    server.start();
    SupportProperties properties =
        new SupportProperties(
            new SupportProperties.Destination(
                "fictional-org/private-support",
                "incomplete",
                "complete",
                "synthetic-token",
                "http://127.0.0.1:"
                    + server.getAddress().getPort()
                    + "/synthetic-webhook-credential"),
            Duration.ofSeconds(1),
            Duration.ofSeconds(1),
            Duration.ofSeconds(3));
    HttpComponentsClientHttpRequestFactory requests =
        new SupportConfiguration().supportRequests(properties);
    RestClient.Builder builder = RestClient.builder();
    new ObservationRestClientCustomizer(registry, new DefaultClientRequestObservationConvention())
        .customize(builder);
    RestClient observed =
        builder
            .requestFactory(requests)
            .baseUrl("http://127.0.0.1:" + server.getAddress().getPort())
            .build();
    try {
      // Establish that the native Boot customizer and handler actually observe ordinary calls.
      observed.get().uri("/non-private-health").retrieve().toBodilessEntity();
      assertThat(observations).hasSize(1);
      assertThat(observations.getFirst()).contains("uri", "/non-private-health");
      observations.clear();

      // When
      new GitHubSupportClient(observed, properties.destination())
          .create(new SupportCaseDraft("Fiction", "Description", true));
      new DiscordSupportSignal(observed, properties.destination(), new SupportDiagnostics())
          .accepted();

      // Then
      assertThat(observations).isEmpty();
      observed.get().uri("/non-private-health").retrieve().toBodilessEntity();
      assertThat(observations).hasSize(1);
    } finally {
      requests.destroy();
      server.stop(0);
    }
  }

  @Test
  @DisplayName(
      "Records only safe operational classification without provider cause or submitted content")
  void excludesPrivateFailureData() {
    // Given
    Logger logger = (Logger) LoggerFactory.getLogger(SupportDiagnostics.class);
    ListAppender<ILoggingEvent> events = new ListAppender<>();
    events.start();
    logger.addAppender(events);
    SupportUnavailableException failure =
        new SupportUnavailableException(
            SupportUnavailableException.Stage.ATTACH,
            SupportUnavailableException.Reason.PROCESS_FAILED,
            new IllegalStateException(
                "contact@example.invalid private-title private-body image.png token stdout stderr"));

    try {
      // When
      new SupportDiagnostics().failure(failure);

      // Then
      assertThat(events.list).hasSize(1);
      ILoggingEvent event = events.list.getFirst();
      assertThat(event.getThrowableProxy()).isNull();
      assertThat(event.getFormattedMessage()).isEqualTo("Support operation unavailable");
      assertThat(event.getKeyValuePairs())
          .extracting(value -> value.key)
          .containsExactly("operation", "stage", "outcome", "reason");
      assertThat(event.getKeyValuePairs())
          .extracting(value -> value.value.toString())
          .containsExactly("support_intake", "attach", "unavailable", "process_failed");
    } finally {
      logger.detachAppender(events);
      events.stop();
    }
  }
}
