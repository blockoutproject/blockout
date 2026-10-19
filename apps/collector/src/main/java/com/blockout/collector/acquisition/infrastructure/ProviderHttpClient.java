package com.blockout.collector.acquisition.infrastructure;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import org.apache.hc.client5.http.HttpResponseException;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.entity.UrlEncodedFormEntity;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.NameValuePair;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * One provider's shared worker, queue and HTTP budget; parsing begins only after a complete read.
 */
@RequiredArgsConstructor
public final class ProviderHttpClient implements AutoCloseable {
  private final CloseableHttpClient http;
  private final ThreadPoolTaskExecutor executor;
  private final Set<HttpHost> origins;
  private final int maxResponseBytes;

  /**
   * Queues a bounded GET shared by every season/family using this provider.
   *
   * @param uri official source location
   * @return complete decompressed bytes, or an exceptional future on acquisition failure
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws TaskRejectedException when active/pending capacity is full
   */
  public CompletableFuture<byte[]> get(URI uri) {
    requireOrigin(uri, origins);
    return executor.submitCompletable(() -> read(new HttpGet(uri)));
  }

  /**
   * Sends a repeatable ordinary form POST; Apache retains its native method/retry rules.
   *
   * @param uri official form action
   * @param fields qualified source form fields, never copied to diagnostics
   * @return complete decompressed response, or acquisition failure
   */
  public CompletableFuture<byte[]> post(URI uri, List<? extends NameValuePair> fields) {
    requireOrigin(uri, origins);
    HttpPost request = new HttpPost(uri);
    request.setEntity(new UrlEncodedFormEntity(fields, StandardCharsets.UTF_8));
    return executor.submitCompletable(() -> read(request));
  }

  /**
   * Rejects foreign origins and URL credentials before connection or redirect execution.
   *
   * @param uri absolute source URI
   * @param origins this provider's configured native HTTP origins
   */
  public static void requireOrigin(URI uri, Set<HttpHost> origins) {
    if (uri.getUserInfo() != null
        || uri.getFragment() != null
        || uri.getHost() == null
        || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
        || !origins.contains(HttpHost.create(uri))) {
      throw new IllegalArgumentException("Unsupported provider origin");
    }
  }

  /**
   * Closes the response on every path; overflow never reaches a parser as valid partial content.
   *
   * @param request native GET or repeatable form POST
   * @return complete decoded content
   * @throws IOException for transport, status or decoded-size failure
   */
  private byte[] read(HttpUriRequestBase request) throws IOException {
    return http.execute(
        request,
        response -> {
          if (response.getCode() < 200 || response.getCode() >= 300) {
            request.cancel();
            throw new HttpResponseException(response.getCode(), "Provider read failed");
          }
          if (response.getEntity() == null) return new byte[0];
          try (InputStream body = response.getEntity().getContent()) {
            byte[] bytes = body.readNBytes(maxResponseBytes);
            if (body.read() != -1) {
              request.cancel();
              throw new IOException("Provider response exceeds the configured byte limit");
            }
            return bytes;
          }
        });
  }

  /** Stops bounded pending work and releases native HTTP resources when the application closes. */
  @Override
  public void close() throws IOException {
    executor.shutdown();
    http.close();
  }
}
