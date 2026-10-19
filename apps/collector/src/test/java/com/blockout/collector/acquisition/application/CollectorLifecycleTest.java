package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.infrastructure.CollectorStartup;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Collector startup and uncertain admission through the generated client")
class CollectorLifecycleTest {
  private HttpServer server;
  private HttpComponentsClientHttpRequestFactory requests;
  private final List<String> calls = new ArrayList<>();
  private UUID registered;
  private UUID admitted;
  private String cycle;
  private boolean loseAdmission;
  private boolean loseRegistration;
  private boolean refuseAdmission;
  private boolean contradictoryPurpose;
  private boolean refuseCycleRead;
  private CollectorLifecycle lifecycle;

  @BeforeEach
  void startPeer() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    JsonMapper json = JsonMapper.builder().build();
    server.createContext(
        "/ingestion",
        exchange -> {
          String method = exchange.getRequestMethod();
          String path = exchange.getRequestURI().getPath();
          calls.add(method + " " + path);
          int status = 200;
          String body;
          if (path.endsWith("collector-runtime")) {
            if (method.equals("PUT"))
              registered =
                  UUID.fromString(
                      json.readTree(exchange.getRequestBody()).get("incarnationId").asText());
            if (method.equals("PUT") && loseRegistration) {
              exchange.close();
              return;
            }
            body =
                "{\"revision\":1,\"incarnationId\":"
                    + (registered == null ? "null" : "\"" + registered + "\"")
                    + "}";
          } else if (method.equals("POST")) {
            JsonNode command = json.readTree(exchange.getRequestBody());
            admitted = UUID.fromString(command.get("cycleId").asText());
            cycle =
                "{\"id\":\""
                    + admitted
                    + "\",\"incarnationId\":\""
                    + registered
                    + "\",\"controlId\":\""
                    + command.get("controlId").asText()
                    + "\",\"cycleOrder\":3,\"mode\":\"periodic\",\"state\":\"running\",\"startedAt\":\"2026-10-19T10:00:00Z\"}";
            if (contradictoryPurpose)
              cycle =
                  cycle.replace(
                      "\"mode\":\"periodic\"",
                      "\"mode\":\"periodic\",\"sourceBindingId\":\"00000000-0000-4000-8000-000000000002\"");
            if (refuseAdmission) {
              byte[] problem =
                  "{\"type\":\"urn:blockout:problem:invalid-cycle-context\",\"title\":\"Conflict\",\"status\":409}"
                      .getBytes(StandardCharsets.UTF_8);
              exchange.getResponseHeaders().add("Content-Type", "application/problem+json");
              exchange.sendResponseHeaders(409, problem.length);
              exchange.getResponseBody().write(problem);
              exchange.close();
              return;
            }
            if (loseAdmission) {
              exchange.close();
              return;
            }
            body = cycle;
          } else {
            status = refuseCycleRead ? 503 : 200;
            body = refuseCycleRead ? "{}" : cycle;
          }
          byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(status, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    requests =
        new HttpComponentsClientHttpRequestFactory(
            HttpClients.custom().disableAutomaticRetries().disableRedirectHandling().build());
    ApiClient api =
        new ApiClient(ApiClient.buildRestClientBuilder().requestFactory(requests).build());
    api.setBasePath("http://127.0.0.1:" + server.getAddress().getPort());
    lifecycle =
        new CollectorLifecycle(
            new CollectionBackendClient(
                new CollectorOperationsApi(api), new CollectionBackendMapperImpl()));
  }

  @AfterEach
  void closePeer() throws Exception {
    server.stop(0);
    requests.destroy();
  }

  @Test
  @DisplayName("Reads then registers the startup UUID once before accepting work")
  void registersOneStartup() throws Exception {

    // When
    new CollectorStartup(lifecycle).run(new DefaultApplicationArguments());

    // Then
    assertThat(calls)
        .containsExactly("GET /ingestion/collector-runtime", "PUT /ingestion/collector-runtime");
    assertThat(registered).isEqualTo(lifecycle.getIncarnationId());
    assertThatThrownBy(lifecycle::start).isInstanceOf(IllegalStateException.class);
    assertThat(calls).hasSize(2);
  }

  @Test
  @DisplayName(
      "Reads the same cycle after a lost admission response before exposing provider context")
  void confirmsUncertainAdmission() {
    // Given
    lifecycle.start();
    loseAdmission = true;
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000000001");

    // When
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(control, null, 0, null);

    // Then
    assertThat(context.getCycle().id()).isEqualTo(admitted);
    assertThat(calls.subList(2, calls.size()))
        .containsExactly(
            "POST /ingestion/collection-cycles", "GET /ingestion/collection-cycles/" + admitted);
    assertThat(context.nextReadOrdinal()).isEqualTo(1);
    assertThat(context.nextReadOrdinal()).isEqualTo(2);
  }

  @Test
  @DisplayName("Exposes no provider context when the same-cycle read is still uncertain")
  void refusesUnconfirmedAdmission() {
    // Given
    lifecycle.start();
    loseAdmission = true;
    refuseCycleRead = true;

    // When / Then
    assertThatThrownBy(() -> lifecycle.admit(UUID.randomUUID(), null, 0, null))
        .isInstanceOf(CollectionBackendFailure.class);
    assertThat(calls.stream().filter(call -> call.startsWith("POST"))).hasSize(1);
  }

  @Test
  @DisplayName("Confirms a lost startup acknowledgement without another registration")
  void confirmsLostRegistration() {
    // Given
    loseRegistration = true;

    // When
    lifecycle.start();

    // Then
    assertThat(calls)
        .containsExactly(
            "GET /ingestion/collector-runtime",
            "PUT /ingestion/collector-runtime",
            "GET /ingestion/collector-runtime");
    assertThat(registered).isEqualTo(lifecycle.getIncarnationId());
  }

  @Test
  @DisplayName("Supersession stops new reads and never automatically registers again")
  void stopsSupersededProcess() {
    // Given
    lifecycle.start();
    CollectorLifecycle.AdmittedCycle old = lifecycle.admit(UUID.randomUUID(), null, 0, null);
    registered = UUID.fromString("00000000-0000-4000-8000-000000000099");
    refuseAdmission = true;

    // When / Then
    assertThatThrownBy(() -> lifecycle.admit(UUID.randomUUID(), null, 0, null))
        .isInstanceOf(CollectionBackendFailure.class);
    assertThatThrownBy(old::nextReadOrdinal).isInstanceOf(IllegalStateException.class);
    int observedCalls = calls.size();
    assertThatThrownBy(() -> lifecycle.admit(UUID.randomUUID(), null, 0, null))
        .isInstanceOf(IllegalStateException.class);
    assertThat(calls).hasSize(observedCalls);
    assertThat(calls.stream().filter(call -> call.startsWith("PUT"))).hasSize(1);
  }

  @Test
  @DisplayName("A contradictory generated cycle never becomes provider authorization")
  void refusesContradictoryContext() {
    // Given
    lifecycle.start();
    contradictoryPurpose = true;

    // When / Then
    assertThatThrownBy(() -> lifecycle.admit(UUID.randomUUID(), null, 0, null))
        .isInstanceOf(IllegalStateException.class);
  }
}
