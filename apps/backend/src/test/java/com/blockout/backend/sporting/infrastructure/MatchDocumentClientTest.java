package com.blockout.backend.sporting.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.sporting.application.MatchDocumentSource.Reference;
import com.blockout.backend.sporting.application.exception.MatchDocumentUnavailableException;
import com.blockout.backend.sporting.application.model.MatchObservation.InformationSheet;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Real bounded HTTP against synthetic local peers, never an official provider or private PDF. */
@DisplayName("Bounded match PDF supplier transport")
class MatchDocumentClientTest {
  private static final byte[] PDF =
      "%PDF-1.7\nsynthetic fixture\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);
  private HttpServer server;
  private URI origin;
  private MatchDocumentClient client;

  /** Allocates a fresh ephemeral HTTP peer; every test declares its own response behavior. */
  @BeforeEach
  void startPeer() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.start();
    origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    client = new MatchDocumentClient(properties(1024, 3, Duration.ofSeconds(1)));
  }

  /** Releases only this test's bounded transport and local peer. */
  @AfterEach
  void stopPeer() {
    client.close();
    server.stop(0);
  }

  @Test
  @DisplayName("Posts the accepted FFVB information form context without deriving a match code")
  void postsInformationContext() {
    // Given
    AtomicReference<String> submitted = new AtomicReference<>();
    server.createContext(
        "/information",
        exchange -> {
          submitted.set(
              exchange.getRequestMethod()
                  + " "
                  + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          pdf(exchange, "application/pdf", PDF);
        });

    // When
    byte[] result =
        client.fetch(new Reference(null, new InformationSheet("2026/2027", "AALNV", "EXACT259")));

    // Then
    assertThat(result).isEqualTo(PDF);
    assertThat(submitted.get())
        .isEqualTo("POST wss_saison=2026%2F2027&codmatch=EXACT259&codent=AALNV");
  }

  @ParameterizedTest
  @ValueSource(strings = {"application/pdf", "application/octet-stream"})
  @DisplayName("Accepts validated published PDF bytes with supported media types")
  void acceptsPublishedPdf(String mediaType) {
    // Given
    server.createContext("/score.pdf", exchange -> pdf(exchange, mediaType, PDF));

    // When
    byte[] result = client.fetch(new Reference(origin.resolve("/score.pdf"), null));

    // Then
    assertThat(result).isEqualTo(PDF);
  }

  @Test
  @DisplayName("Follows an approved information POST redirect as a GET")
  void followsApprovedRedirect() {
    // Given
    AtomicReference<String> method = new AtomicReference<>();
    server.createContext(
        "/information",
        exchange -> {
          exchange.getResponseHeaders().add("Location", "/resolved.pdf");
          exchange.sendResponseHeaders(303, -1);
          exchange.close();
        });
    server.createContext(
        "/resolved.pdf",
        exchange -> {
          method.set(exchange.getRequestMethod());
          pdf(exchange, "application/pdf", PDF);
        });

    // When
    byte[] result =
        client.fetch(new Reference(null, new InformationSheet("2026/2027", "ORIGIN", "EXACT259")));

    // Then
    assertThat(result).isEqualTo(PDF);
    assertThat(method.get()).isEqualTo("GET");
  }

  @Test
  @DisplayName("Refuses an unapproved redirect before issuing another request")
  void refusesUnapprovedRedirect() {
    // Given
    server.createContext(
        "/redirect",
        exchange -> {
          exchange
              .getResponseHeaders()
              .add("Location", "http://127.0.0.1:1/private?secret=fixture");
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> client.fetch(new Reference(origin.resolve("/redirect"), null));

    // Then
    assertThatThrownBy(read)
        .isInstanceOf(MatchDocumentUnavailableException.class)
        .hasMessage("Match document unavailable");
  }

  @ParameterizedTest
  @ValueSource(strings = {"application/pdf", "text/html"})
  @DisplayName("Rejects HTML even when the supplier labels it as PDF")
  void refusesHtml(String type) {
    // Given
    server.createContext(
        "/html",
        exchange ->
            pdf(
                exchange,
                type,
                "<html>private supplier detail</html>".getBytes(StandardCharsets.UTF_8)));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> client.fetch(new Reference(origin.resolve("/html"), null));

    // Then
    assertThatThrownBy(read)
        .isInstanceOf(MatchDocumentUnavailableException.class)
        .hasMessage("Match document unavailable");
  }

  @Test
  @DisplayName("Enforces the decoded body limit even for compressed PDFs")
  void boundsDecodedBytes() throws IOException {
    // Given
    client.close();
    client = new MatchDocumentClient(properties(12, 3, Duration.ofSeconds(1)));
    ByteArrayOutputStream compressed = new ByteArrayOutputStream();
    try (GZIPOutputStream gzip = new GZIPOutputStream(compressed)) {
      gzip.write(PDF);
    }
    server.createContext(
        "/large",
        exchange -> {
          exchange.getResponseHeaders().add("Content-Encoding", "gzip");
          pdf(exchange, "application/pdf", compressed.toByteArray());
        });

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> client.fetch(new Reference(origin.resolve("/large"), null));

    // Then
    assertThatThrownBy(read).isInstanceOf(MatchDocumentUnavailableException.class);
  }

  @Test
  @DisplayName("Bounds redirects without retrying the supplier")
  void boundsRedirects() {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/loop",
        exchange -> {
          requests.incrementAndGet();
          exchange.getResponseHeaders().add("Location", "/loop");
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> client.fetch(new Reference(origin.resolve("/loop"), null));

    // Then
    assertThatThrownBy(read).isInstanceOf(MatchDocumentUnavailableException.class);
    assertThat(requests).hasValue(4);
  }

  @Test
  @DisplayName("Fails a stalled supplier once within the configured native timeout")
  void boundsStalledSupplier() {
    // Given
    client.close();
    client = new MatchDocumentClient(properties(1024, 3, Duration.ofMillis(100)));
    CountDownLatch release = new CountDownLatch(1);
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/slow",
        exchange -> {
          requests.incrementAndGet();
          try {
            release.await();
          } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
          }
          exchange.close();
        });

    // When
    try {
      org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
          () -> client.fetch(new Reference(origin.resolve("/slow"), null));

      // Then
      assertThatThrownBy(read).isInstanceOf(MatchDocumentUnavailableException.class);
      assertThat(requests).hasValue(1);
    } finally {
      release.countDown();
    }
  }

  @Test
  @DisplayName("Refuses disabled origins without dispatching an HTTP call")
  void refusesDisabledOrigin() {
    // Given
    client.close();
    client =
        new MatchDocumentClient(
            new MatchDocumentProperties(
                origin.resolve("/information"),
                Duration.ofSeconds(1),
                Duration.ofSeconds(1),
                1024,
                3,
                Set.of()));
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/private",
        exchange -> {
          requests.incrementAndGet();
          pdf(exchange, "application/pdf", PDF);
        });

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> client.fetch(new Reference(origin.resolve("/private"), null));

    // Then
    assertThatThrownBy(read).isInstanceOf(MatchDocumentUnavailableException.class);
    assertThat(requests).hasValue(0);
  }

  /**
   * Supplies only this synthetic peer's origin and the scenario's bounded limits.
   *
   * @param bytes maximum decoded body size
   * @param redirects allowed redirect count
   * @param timeout native connection/read deadlines
   * @return synthetic local relay configuration
   */
  private MatchDocumentProperties properties(int bytes, int redirects, Duration timeout) {
    return new MatchDocumentProperties(
        origin.resolve("/information"), timeout, timeout, bytes, redirects, Set.of(origin));
  }

  /**
   * Serves synthetic bytes with explicit media; the real client owns decoding and validation.
   *
   * @param exchange current local request
   * @param mediaType scenario-specific response media
   * @param bytes synthetic response bytes, optionally compressed by the test
   * @throws IOException if the synthetic peer cannot complete the response
   */
  private static void pdf(HttpExchange exchange, String mediaType, byte[] bytes)
      throws IOException {
    exchange.getResponseHeaders().add("Content-Type", mediaType);
    exchange.sendResponseHeaders(200, bytes.length);
    exchange.getResponseBody().write(bytes);
    exchange.close();
  }
}
