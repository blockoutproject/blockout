package com.blockout.collector.acquisition.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.config.AcquisitionConfiguration;
import com.blockout.collector.config.AcquisitionProperties;
import com.sun.net.httpserver.HttpServer;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.GZIPOutputStream;
import org.apache.hc.client5.http.HttpResponseException;
import org.apache.hc.client5.http.RedirectException;
import org.apache.hc.core5.http.ConnectionRequestTimeoutException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Exercises native transport limits against isolated peers, never live source providers. */
@DisplayName("Bounded provider HTTP reads")
class ProviderHttpClientIntegrationTest {
  private HttpServer server;
  private URI origin;
  private ExecutorService peers;

  /** Starts an isolated origin with two workers so stalled responses cannot block every request. */
  @BeforeEach
  void startPeer() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    peers = Executors.newFixedThreadPool(2);
    server.setExecutor(peers);
    server.start();
    origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
  }

  /** Releases the test-owned listener and workers after each transport scenario. */
  @AfterEach
  void stopPeer() {
    server.stop(0);
    peers.shutdownNow();
  }

  @ParameterizedTest
  @ValueSource(ints = {302, 503})
  @DisplayName("Native retries and redirects dispose of intermediate bodies before the final page")
  void disposesIntermediateResponses(int status) throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          int attempt = requests.incrementAndGet();
          if (attempt == 1) {
            exchange.getResponseHeaders().add("Location", "/source");
            exchange.getResponseHeaders().add("Retry-After", "1");
            exchange.sendResponseHeaders(status, 33);
            exchange.getResponseBody().write(new byte[33]);
          } else {
            exchange.sendResponseHeaders(200, 2);
            exchange.getResponseBody().write("ok".getBytes(StandardCharsets.UTF_8));
          }
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      ProviderResponse result = client.page(origin.resolve("/source"));

      // Then
      assertThat(result.body()).isEqualTo("ok".getBytes(StandardCharsets.UTF_8));
      assertThat(requests).hasValue(2);
    }
  }

  @Test
  @DisplayName("Raises checked transport failures directly with their native cause")
  void raisesTransportFailureSynchronously() throws Exception {
    // Given
    server.createContext(
        "/source",
        exchange -> {
          exchange.sendResponseHeaders(500, -1);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(read)
          .isInstanceOf(UncheckedIOException.class)
          .hasCauseInstanceOf(HttpResponseException.class);
    }
  }

  @ParameterizedTest
  @ValueSource(ints = {302, 503})
  @DisplayName("Requires a new provider permit for each retry or redirect exchange")
  void budgetsEveryActualExchange(int status) throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          exchange.getResponseHeaders().add("Location", "/source");
          exchange.getResponseHeaders().add("Retry-After", "1");
          exchange.sendResponseHeaders(status, -1);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 1)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(read).isInstanceOf(RequestNotPermitted.class);
      assertThat(requests).hasValue(1);
    }
  }

  @Test
  @DisplayName("Returns complete decoded bytes at the configured boundary")
  void readsCompleteDecodedBody() throws Exception {
    // Given
    byte[] content = "a".repeat(32).getBytes(StandardCharsets.UTF_8);
    serveGzip(content);
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      byte[] actual = client.page(origin.resolve("/source")).body();

      // Then
      assertThat(actual).isEqualTo(content);
    }
  }

  @Test
  @DisplayName("Rejects decompressed overflow instead of returning truncated content")
  void refusesDecodedOverflow() throws Exception {
    // Given
    serveGzip("a".repeat(33).getBytes(StandardCharsets.UTF_8));
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(action)
          .hasRootCauseMessage("Provider response exceeds the configured byte limit");
    }
  }

  @Test
  @DisplayName("Refuses an origin outside this provider before any request")
  void refusesUnknownOrigin() throws Exception {
    // Given
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(URI.create("http://localhost:" + server.getAddress().getPort()));

      // Then
      assertThatThrownBy(action).isInstanceOf(IllegalArgumentException.class);
    }
  }

  @Test
  @DisplayName("Refuses a redirect to an origin outside the provider")
  void refusesForeignRedirect() throws Exception {
    // Given
    AtomicInteger followed = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          exchange
              .getResponseHeaders()
              .add("Location", "http://localhost:" + server.getAddress().getPort() + "/foreign");
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });
    server.createContext(
        "/foreign",
        exchange -> {
          followed.incrementAndGet();
          exchange.sendResponseHeaders(200, -1);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(action).isInstanceOf(IllegalArgumentException.class);
      assertThat(followed).hasValue(0);
    }
  }

  @Test
  @DisplayName("Bounds active connections and pending caller lease waiting")
  void boundsActiveAndPendingWork() throws Exception {
    // Given
    CountDownLatch entered = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          exchange.sendResponseHeaders(200, 0);
          entered.countDown();
          try {
            // Progress keeps the leased response alive while a different caller exhausts its lease
            // wait.
            while (!release.await(25, TimeUnit.MILLISECONDS)) {
              exchange.getResponseBody().write('x');
              exchange.getResponseBody().flush();
            }
          } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
          } finally {
            exchange.close();
          }
        });
    try (ExecutorService callers = Executors.newSingleThreadExecutor();
        ProviderHttpClient client = client(1024, Duration.ofMillis(250), 1)) {
      Future<ProviderResponse> running =
          callers.submit(() -> client.page(origin.resolve("/source")));
      assertThat(entered.await(3, TimeUnit.SECONDS)).isTrue();
      try {
        // When
        org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
            () -> client.page(origin.resolve("/source"));

        // Then
        assertThatThrownBy(read)
            .isInstanceOf(UncheckedIOException.class)
            .hasCauseInstanceOf(ConnectionRequestTimeoutException.class);
        assertThat(requests).hasValue(1);
      } finally {
        release.countDown();
      }
      assertThat(running.get(5, TimeUnit.SECONDS)).isNotNull();
    }
  }

  @Test
  @DisplayName("Closing the transport ends pending reads without another supplier request")
  void closesPendingReads() throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    CountDownLatch entered = new CountDownLatch(1);
    CountDownLatch waiting = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          entered.countDown();
          try {
            release.await(5, TimeUnit.SECONDS);
          } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
          } finally {
            exchange.close();
          }
        });
    try (ExecutorService callers = Executors.newFixedThreadPool(2);
        ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      Future<Throwable> active =
          callers.submit(() -> catchThrowable(() -> client.page(origin.resolve("/source"))));
      assertThat(entered.await(3, TimeUnit.SECONDS)).isTrue();
      Future<Throwable> pending =
          callers.submit(
              () -> {
                waiting.countDown();
                return catchThrowable(() -> client.page(origin.resolve("/source")));
              });
      assertThat(waiting.await(3, TimeUnit.SECONDS)).isTrue();

      // When
      client.close();

      // Then
      assertThat(active.get(5, TimeUnit.SECONDS))
          .isInstanceOfAny(UncheckedIOException.class, IllegalStateException.class);
      assertThat(pending.get(5, TimeUnit.SECONDS))
          .isInstanceOfAny(UncheckedIOException.class, IllegalStateException.class);
      assertThat(requests).hasValue(1);
    } finally {
      release.countDown();
    }
  }

  @Test
  @DisplayName("Rejects a read when its provider permit cannot be obtained within the bound")
  void boundsPermitWait() throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          exchange.sendResponseHeaders(200, -1);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 1)) {
      client.page(origin.resolve("/source"));
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(action).isInstanceOf(RequestNotPermitted.class);
      assertThat(requests).hasValue(1);
    }
  }

  @Test
  @DisplayName("Interrupting a started caller produces no further supplier request")
  void interruptsStartedCaller() throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    CountDownLatch started = new CountDownLatch(1);
    CountDownLatch finished = new CountDownLatch(1);
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          exchange.sendResponseHeaders(200, -1);
          exchange.close();
        });
    try (ExecutorService callers = Executors.newSingleThreadExecutor();
        ProviderHttpClient client = client(32, Duration.ofSeconds(3), 1, Duration.ofSeconds(5))) {
      client.page(origin.resolve("/source"));
      Future<?> pending =
          callers.submit(
              () -> {
                started.countDown();
                try {
                  client.page(origin.resolve("/source"));
                } finally {
                  finished.countDown();
                }
              });
      assertThat(started.await(3, TimeUnit.SECONDS)).isTrue();

      // When
      pending.cancel(true);

      // Then
      assertThat(finished.await(3, TimeUnit.SECONDS)).isTrue();
      assertThat(requests).hasValue(1);
    }
  }

  @ParameterizedTest
  @ValueSource(ints = {429, 503})
  @DisplayName("Uses at most two additional native status attempts for a repeatable form POST")
  void boundsStatusRetries(int status) throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          exchange.getResponseHeaders().add("Retry-After", "1");
          exchange.sendResponseHeaders(status, -1);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.post(origin.resolve("/source"), List.of());

      // Then
      assertThatThrownBy(action).hasRootCauseInstanceOf(HttpResponseException.class);
      assertThat(requests).hasValue(3);
    }
  }

  @ParameterizedTest
  @CsvSource({"false, 3", "true, 1"})
  @DisplayName("Retains native GET I/O retries without replaying a read-only POST")
  void preservesNativeMethodRetries(boolean post, int attempts) throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> {
            if (post) client.post(origin.resolve("/source"), List.of());
            else client.page(origin.resolve("/source"));
          };

      // Then
      assertThatThrownBy(action).hasRootCauseInstanceOf(IOException.class);
      assertThat(requests).hasValue(attempts);
    }
  }

  @Test
  @DisplayName("Does not retry a native socket timeout")
  void boundsReadTimeout() throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    CountDownLatch release = new CountDownLatch(1);
    server.createContext(
        "/source",
        exchange -> {
          requests.incrementAndGet();
          try {
            release.await(5, TimeUnit.SECONDS);
          } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
          }
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofMillis(100), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(action).hasRootCauseInstanceOf(SocketTimeoutException.class);
      assertThat(requests).hasValue(1);
    } finally {
      release.countDown();
    }
  }

  @Test
  @DisplayName("Stops following allowed redirects at the configured native limit")
  void boundsRedirectCount() throws Exception {
    // Given
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/",
        exchange -> {
          int index = requests.incrementAndGet();
          exchange.getResponseHeaders().add("Location", "/step-" + index);
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(action).hasRootCauseInstanceOf(RedirectException.class);
      assertThat(requests).hasValue(2);
    }
  }

  @Test
  @DisplayName("Aborts overflow without draining an unbounded response to reuse its connection")
  void abortsOverflowImmediately() throws Exception {
    // Given
    CountDownLatch release = new CountDownLatch(1);
    server.createContext(
        "/source",
        exchange -> {
          exchange.sendResponseHeaders(200, 0);
          exchange.getResponseBody().write(new byte[33]);
          exchange.getResponseBody().flush();
          try {
            release.await(5, TimeUnit.SECONDS);
          } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
          }
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () -> client.page(origin.resolve("/source"));

      // Then
      assertThatThrownBy(action)
          .hasRootCauseMessage("Provider response exceeds the configured byte limit");
    } finally {
      release.countDown();
    }
  }

  @Test
  @DisplayName("Returns a complete HTTP 400 body at the configured byte boundary")
  void returnsBoundedBadRequestBody() throws Exception {
    // Given
    server.createContext(
        "/source",
        exchange -> {
          exchange.sendResponseHeaders(400, 32);
          exchange.getResponseBody().write(new byte[32]);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      ProviderHttpClient.StatusResponse response =
          client.getWithBadRequest(origin.resolve("/source"));

      // Then
      assertThat(response.status()).isEqualTo(400);
      assertThat(response.body()).hasSize(32);
    }
  }

  @Test
  @DisplayName("Rejects an HTTP 400 body exceeding the configured byte boundary")
  void rejectsOversizedBadRequestBody() throws Exception {
    // Given
    server.createContext(
        "/source",
        exchange -> {
          exchange.sendResponseHeaders(400, 33);
          exchange.getResponseBody().write(new byte[33]);
          exchange.close();
        });
    try (ProviderHttpClient client = client(32, Duration.ofSeconds(3), 10)) {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
          () -> client.getWithBadRequest(origin.resolve("/source"));

      // Then
      assertThatThrownBy(read)
          .hasRootCauseMessage("Provider response exceeds the configured byte limit");
    }
  }

  /**
   * Builds one native connection with finite lease waiting against the isolated peer.
   *
   * @param bytes maximum decoded response size
   * @param timeout native connection and response timeout
   * @param permits maximum requests in the test period
   * @return independently closable provider budget
   */
  private ProviderHttpClient client(int bytes, Duration timeout, int permits) {
    return client(bytes, timeout, permits, Duration.ZERO);
  }

  /**
   * Builds the same isolated native budget with a scenario-owned finite permit wait.
   *
   * @param bytes maximum decoded response size
   * @param timeout native connection, response and lease wait
   * @param permits shared request budget for the test period
   * @param permitTimeout maximum wait for another native request permit
   * @return caller-owned transport without a provider executor
   */
  private ProviderHttpClient client(
      int bytes, Duration timeout, int permits, Duration permitTimeout) {
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            timeout,
            bytes,
            1,
            1,
            permits,
            Duration.ofMinutes(1),
            permitTimeout,
            List.of());
    return new AcquisitionConfiguration().ffvbProviderClient(properties);
  }

  /**
   * Serves compressed bytes so limits exercise the actual decompression boundary.
   *
   * @param content complete decoded synthetic response
   * @throws Exception if compression or the local fixture cannot be prepared
   */
  private void serveGzip(byte[] content) throws Exception {
    ByteArrayOutputStream compressed = new ByteArrayOutputStream();
    try (GZIPOutputStream gzip = new GZIPOutputStream(compressed)) {
      gzip.write(content);
    }
    byte[] bytes = compressed.toByteArray();
    server.createContext(
        "/source",
        exchange -> {
          exchange.getResponseHeaders().add("Content-Encoding", "gzip");
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
  }
}
