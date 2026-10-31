package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportSubmission;
import com.blockout.backend.support.application.SupportValidation;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Actual webhook transport and complete-send owner against a fictional local HTTP receiver. */
@DisplayName("Independent private support signal")
@ExtendWith(OutputCaptureExtension.class)
class DiscordSupportSignalTest {
  @TempDir Path temporaryDirectory;

  @ParameterizedTest
  @ValueSource(ints = {200, 503, 0})
  @DisplayName(
      "Keeps receipt accepted across successful, refused and timed-out secondary signaling")
  void preservesAcceptance(int status, CapturedOutput output) throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    server.setExecutor(executor);
    AtomicReference<String> body = new AtomicReference<>();
    AtomicReference<String> query = new AtomicReference<>();
    AtomicReference<String> authorization = new AtomicReference<>();
    server.createContext(
        "/synthetic-webhook",
        exchange -> {
          body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          query.set(exchange.getRequestURI().getQuery());
          authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
          try {
            if (status == 0) Thread.sleep(2_000);
            byte[] bytes =
                "{\"id\":\"fictional-message\",\"content\":\"raw-discord-response\"}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status == 0 ? 200 : status, bytes.length);
            exchange.getResponseBody().write(bytes);
          } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
          } finally {
            exchange.close();
          }
        });
    server.start();
    SupportProperties properties =
        new SupportProperties(
            new SupportProperties.Destination(
                "fictional-org/private-support",
                "incomplete",
                "complete",
                "synthetic-token",
                "http://127.0.0.1:" + server.getAddress().getPort() + "/synthetic-webhook"),
            Duration.ofMillis(300),
            Duration.ofMillis(300),
            Duration.ofSeconds(3));
    HttpComponentsClientHttpRequestFactory requests =
        new SupportConfiguration().supportRequests(properties);
    SupportCases cases = mock(SupportCases.class);
    when(cases.create(any())).thenReturn(17L);
    DiscordSupportSignal signal =
        new DiscordSupportSignal(
            RestClient.builder().requestFactory(requests).build(),
            properties.destination(),
            new SupportDiagnostics());
    CreateSupportRequest create =
        new CreateSupportRequest(
            new SupportValidation(temporaryDirectory),
            cases,
            mock(SupportAttachments.class),
            signal);
    SupportSubmission.Metadata metadata =
        new SupportSubmission.Metadata(
            SupportRequestKindEnum.PROBLEM,
            null,
            "private-title",
            "private-description",
            "private-contact@example.invalid",
            new SupportSubmission.Context(null, null, null, null, null, null, null, null, null));

    try {
      // When
      assertThat(create.create(metadata, List.of())).isNotNull();

      // Then
      assertThat(query.get()).isEqualTo("wait=true");
      assertThat(authorization.get()).isNull();
      assertThat(JsonMapper.builder().build().readTree(body.get()).get("content").asText())
          .isEqualTo(
              "A support request has been received. https://github.com/fictional-org/private-support/issues");
      assertThat(body.get())
          .doesNotContain(
              "private-title", "private-description", "private-contact", "synthetic-token");
      assertThat(output.getAll())
          .doesNotContain(
              "raw-discord-response", "synthetic-webhook", "synthetic-token", "private-contact");
    } finally {
      requests.destroy();
      server.stop(0);
      executor.shutdownNow();
    }
  }
}
