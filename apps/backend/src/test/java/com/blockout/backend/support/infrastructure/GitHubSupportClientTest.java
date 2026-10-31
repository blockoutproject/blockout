package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportCaseDraft;
import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportSubmission;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportValidation;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Real RestClient and native timeout/redirect configuration against a dynamic loopback peer. */
@DisplayName("Bounded private GitHub intake transport")
class GitHubSupportClientTest {
  @TempDir Path temporaryDirectory;
  private HttpServer server;
  private ExecutorService executor;
  private HttpComponentsClientHttpRequestFactory requests;
  private final List<Call> calls = new CopyOnWriteArrayList<>();
  private final JsonMapper json = JsonMapper.builder().build();

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Refuses an issue whose initial intake label was silently dropped")
  void refusesUnmarkedCreation(boolean withImages) throws Exception {
    // Given
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          respond(exchange, 201, "{\"number\":17,\"labels\":[]}");
        });
    SupportAttachments attachments = mock(SupportAttachments.class);
    SupportSignal signal = mock(SupportSignal.class);
    CreateSupportRequest create =
        new CreateSupportRequest(
            new SupportValidation(temporaryDirectory), client(), attachments, signal);
    SupportSubmission.Metadata metadata =
        new SupportSubmission.Metadata(
            SupportRequestKindEnum.PROBLEM,
            null,
            "Fiction",
            "Description",
            "fiction@example.invalid",
            new SupportSubmission.Context(null, null, null, null, null, null, null, null, null));
    List<byte[]> images =
        withImages
            ? List.of(new ClassPathResource("support/synthetic.png").getContentAsByteArray())
            : List.of();

    // When / Then
    assertThatThrownBy(() -> create.create(metadata, images))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(calls).hasSize(1);
    verifyNoInteractions(attachments, signal);
    assertThat(temporaryDirectory).isEmptyDirectory();
  }

  /** Owns only this test's peer and HTTP connection factory. */
  @BeforeEach
  void start() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    executor = Executors.newVirtualThreadPerTaskExecutor();
    server.setExecutor(executor);
    server.start();
    requests = new SupportConfiguration().supportRequests(properties());
  }

  /** Releases the dynamic listener, accepted handlers and native client. */
  @AfterEach
  void close() throws Exception {
    requests.destroy();
    server.stop(0);
    executor.shutdownNow();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Creates in the fixed repository with the selected intake label and complete private content")
  void createsPrivateCase(boolean complete) throws Exception {
    // Given
    String expectedLabel = complete ? "intake complete" : "intake incomplete";
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          respond(
              exchange,
              201,
              "{\"number\":17,\"labels\":[{\"name\":\""
                  + expectedLabel
                  + "\"}],\"html_url\":\"https://private.invalid/17\"}");
        });
    SupportCaseDraft draft =
        new SupportCaseDraft("Private title 🏐", "Private body\nreply@example.invalid", complete);

    // When
    long issue = client().create(draft);

    // Then
    assertThat(issue).isEqualTo(17);
    assertThat(calls).hasSize(1);
    assertThat(calls.getFirst().method()).isEqualTo("POST");
    assertThat(calls.getFirst().path()).isEqualTo("/repos/fictional-org/private-support/issues");
    assertThat(calls.getFirst().authorization()).isEqualTo("Bearer synthetic-token");
    assertThat(json.readTree(calls.getFirst().body()).get("body").asText()).isEqualTo(draft.body());
    assertThat(json.readTree(calls.getFirst().body()).get("labels").get(0).asText())
        .isEqualTo(expectedLabel);
  }

  @Test
  @DisplayName(
      "Changes only the intake labels without overwriting attachment references or other labels")
  void preservesExistingContent() {
    // Given
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          respond(exchange, 200, "[]");
        });

    // When
    client().complete(17L);

    // Then
    assertThat(calls).extracting(Call::method).containsExactly("POST", "DELETE");
    assertThat(calls)
        .extracting(Call::path)
        .containsExactly(
            "/repos/fictional-org/private-support/issues/17/labels",
            "/repos/fictional-org/private-support/issues/17/labels/intake%20incomplete");
    assertThat(calls.getFirst().body()).isEqualTo("{\"labels\":[\"intake complete\"]}");
    assertThat(calls.getLast().body()).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"complete", "incomplete", "both", "unreadable", "lost"})
  @DisplayName("Uses one known-issue read after an ambiguous final label response")
  void resolvesOnlyCurrentAmbiguity(String observation) {
    // Given
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          if (exchange.getRequestMethod().equals("GET")) {
            String labels =
                switch (observation) {
                  case "complete", "lost" ->
                      "[{\"name\":\"INTAKE COMPLETE\"},{\"name\":\"operator-label\"}]";
                  case "both" ->
                      "[{\"name\":\"intake complete\"},{\"name\":\"intake incomplete\"}]";
                  default -> "[{\"name\":\"intake incomplete\"}]";
                };
            respond(
                exchange,
                observation.equals("unreadable") ? 503 : 200,
                "{\"labels\":" + labels + "}");
          } else {
            if (observation.equals("lost") && exchange.getRequestMethod().equals("DELETE")) {
              try {
                Thread.sleep(2_000);
              } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
              }
            }
            respond(exchange, exchange.getRequestMethod().equals("DELETE") ? 503 : 200, "[]");
          }
        });

    // When / Then
    if (observation.equals("complete") || observation.equals("lost")) client().complete(17L);
    else
      assertThatThrownBy(() -> client().complete(17L))
          .isInstanceOf(SupportUnavailableException.class);
    assertThat(calls).extracting(Call::method).containsExactly("POST", "DELETE", "GET");
    assertThat(calls.getLast().path()).isEqualTo("/repos/fictional-org/private-support/issues/17");
  }

  @ParameterizedTest
  @ValueSource(ints = {403, 422})
  @DisplayName("A definitive marking refusal never triggers a read or write replay")
  void refusesDefiniteMarkFailure(int status) {
    // Given
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          respond(exchange, status, "private-provider-output");
        });

    // When / Then
    assertThatThrownBy(() -> client().complete(17L))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(calls).hasSize(1);
  }

  @Test
  @DisplayName("Bounds a lost create response without searching or replaying the issue")
  void boundsLostCreation() {
    // Given
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          try {
            Thread.sleep(2_000);
            respond(exchange, 201, "{\"number\":17}");
          } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
          }
        });

    // When / Then
    long started = System.nanoTime();
    assertThatThrownBy(() -> client().create(new SupportCaseDraft("title", "body", true)))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
    assertThat(calls).hasSize(1);
  }

  @ParameterizedTest
  @ValueSource(ints = {307, 308})
  @DisplayName("Refuses redirects without forwarding the private token")
  void refusesRedirect(int status) {
    // Given
    server.createContext(
        "/",
        exchange -> {
          record(exchange);
          exchange
              .getResponseHeaders()
              .set(
                  "Location",
                  "http://127.0.0.1:" + server.getAddress().getPort() + "/credential-sink");
          respond(exchange, status, "private-body");
        });

    // When / Then
    assertThatThrownBy(() -> client().create(new SupportCaseDraft("title", "body", true)))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(calls).hasSize(1);
  }

  /** Builds the actual adapter with only its transport destination replaced by this peer. */
  private GitHubSupportClient client() {
    return new GitHubSupportClient(
        RestClient.builder()
            .requestFactory(requests)
            .baseUrl("http://127.0.0.1:" + server.getAddress().getPort())
            .build(),
        properties().destination());
  }

  /** Fictional server-owned inputs with short, explicit HTTP waiting limits. */
  private static SupportProperties properties() {
    return new SupportProperties(
        new SupportProperties.Destination(
            "fictional-org/private-support",
            "intake incomplete",
            "intake complete",
            "synthetic-token",
            "https://discord.com/api/webhooks/1/synthetic"),
        Duration.ofMillis(300),
        Duration.ofMillis(300),
        Duration.ofSeconds(3));
  }

  /**
   * Captures the request received by the controlled peer, never a production provider.
   *
   * @param exchange this scenario's native HTTP request
   */
  private void record(HttpExchange exchange) throws IOException {
    calls.add(
        new Call(
            exchange.getRequestMethod(),
            exchange.getRequestURI().toASCIIString(),
            new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8),
            exchange.getRequestHeaders().getFirst("Authorization")));
  }

  /**
   * Sends a scenario-owned synthetic provider response through ordinary HTTP.
   *
   * @param exchange native peer request to answer and close
   * @param status scenario-owned HTTP outcome
   * @param body fictional provider content
   */
  private static void respond(HttpExchange exchange, int status, String body) throws IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().set("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, bytes.length);
    exchange.getResponseBody().write(bytes);
    exchange.close();
  }

  /** Synthetic peer evidence retained only in this test's memory. */
  private record Call(String method, String path, String body, String authorization) {}
}
