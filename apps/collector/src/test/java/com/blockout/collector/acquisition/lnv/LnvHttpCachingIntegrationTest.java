package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionConfiguration;
import com.blockout.collector.config.AcquisitionProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Verifies native cache directives and the offset cookie against a loopback HTTP origin. */
@DisplayName("LNV native HTTP caching")
class LnvHttpCachingIntegrationTest {
  @ParameterizedTest
  @CsvSource({"200, true, 2", "304, false, 1"})
  @DisplayName("Revalidation distinguishes a changed image body from cached 304 reuse")
  void distinguishesRevalidation(int status, boolean supplierRead, int expectedByte)
      throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger reads = new AtomicInteger();
    server.createContext(
        "/logo",
        exchange -> {
          int count = reads.incrementAndGet();
          exchange.getResponseHeaders().add("Cache-Control", "public, max-age=0");
          exchange
              .getResponseHeaders()
              .add("ETag", count == 1 || status == 304 ? "\"v1\"" : "\"v2\"");
          exchange.getResponseHeaders().add("Content-Type", "image/jpeg");
          int response = count == 1 ? 200 : status;
          exchange.sendResponseHeaders(response, response == 304 ? -1 : 1);
          if (response != 304) exchange.getResponseBody().write(count);
          exchange.close();
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().lnvProviderClient(properties)) {
      http.image(origin.resolve("/logo"));

      // When
      ProviderResponse result = http.image(origin.resolve("/logo"));

      // Then
      assertThat(reads).hasValue(2);
      assertThat(result.supplierRead()).isEqualTo(supplierRead);
      assertThat(result.body()).containsExactly(expectedByte);
    } finally {
      server.stop(0);
    }
  }

  @Test
  @DisplayName("Origin-authorized cached image reuse is not a new supplier observation")
  void reusesImageWithoutFreshness() throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger reads = new AtomicInteger();
    server.createContext(
        "/logo",
        exchange -> {
          reads.incrementAndGet();
          exchange.getResponseHeaders().add("Cache-Control", "public, max-age=7200");
          exchange.getResponseHeaders().add("Content-Type", "image/jpeg");
          exchange.sendResponseHeaders(200, 3);
          exchange.getResponseBody().write(new byte[] {1, 2, 3});
          exchange.close();
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().lnvProviderClient(properties)) {
      // When
      ProviderResponse first = http.image(origin.resolve("/logo"));
      ProviderResponse second = http.image(origin.resolve("/logo"));

      // Then
      assertThat(first.supplierRead()).isTrue();
      assertThat(second.supplierRead()).isFalse();
      assertThat(second.body()).containsExactly(1, 2, 3);
      assertThat(reads).hasValue(1);
    } finally {
      server.stop(0);
    }
  }

  @Test
  @DisplayName("Ordinary pages are never cached and pin the explicit offset-zero convention")
  void readsPagesWithoutCache() throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger reads = new AtomicInteger();
    AtomicReference<String> cookie = new AtomicReference<>();
    server.createContext(
        "/page",
        exchange -> {
          cookie.set(exchange.getRequestHeaders().getFirst("Cookie"));
          reads.incrementAndGet();
          exchange.getResponseHeaders().add("Cache-Control", "public, max-age=7200");
          exchange.sendResponseHeaders(200, 2);
          exchange.getResponseBody().write(new byte[] {1, 2});
          exchange.close();
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().lnvProviderClient(properties)) {
      // When
      http.page(origin.resolve("/page"));
      http.page(origin.resolve("/page"));

      // Then
      assertThat(reads).hasValue(2);
      assertThat(cookie).hasValue("timezoneoffset=0");
    } finally {
      server.stop(0);
    }
  }
}
