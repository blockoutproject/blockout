package com.blockout.collector.acquisition.infrastructure.provider;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import org.apache.hc.client5.http.HttpResponseException;
import org.apache.hc.client5.http.cache.CacheResponseStatus;
import org.apache.hc.client5.http.cache.HttpCacheContext;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.entity.UrlEncodedFormEntity;
import org.apache.hc.client5.http.impl.DefaultSchemePortResolver;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.routing.RoutingSupport;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.NameValuePair;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * One provider's shared worker, queue and HTTP budget; parsing begins only after a complete read.
 */
@RequiredArgsConstructor
public final class ProviderHttpClient implements AutoCloseable {
  /** Per-exchange native protocol evidence; distinguishes 200 revalidation from 304 reuse. */
  public static final String SUPPLIER_BODY = "blockout.supplier-body";

  private final CloseableHttpClient http;
  private final ThreadPoolTaskExecutor executor;
  private final Set<HttpHost> origins;
  private final int maxResponseBytes;

  /** Complete response metadata; cache reuse deliberately carries no new observation timestamp. */
  public record Response(byte[] body, URI url, boolean supplierRead) {}

  /**
   * Reads a page with final redirect context and no storage in the image cache.
   *
   * @param uri published page URL
   * @return complete bounded bytes and actual final URL
   */
  public CompletableFuture<Response> page(URI uri) {
    requireOrigin(uri, origins);
    HttpGet request = new HttpGet(uri);
    request.setHeader("Cache-Control", "no-store");
    request.setHeader("Cookie", "timezoneoffset=0");
    return executor.submitCompletable(() -> response(request, true));
  }

  /**
   * Reads an image through native origin-directed caching; cache hits are explicitly identified.
   *
   * @param uri qualified published image URL
   * @return bounded response without treating cache reuse as a new provider observation
   */
  public CompletableFuture<Response> image(URI uri) {
    requireOrigin(uri, origins);
    return executor.submitCompletable(() -> response(new HttpGet(uri)));
  }

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
    HttpGet request = new HttpGet(uri);
    request.setHeader("Cache-Control", "no-store");
    return executor.submitCompletable(() -> read(request));
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
   * Reads a native document form response as HTML, refusing PDF entities before body consumption.
   *
   * @param uri qualified match form action
   * @param fields ephemeral published form state
   * @return final HTML response context, never a downloaded PDF
   */
  public CompletableFuture<Response> postPage(URI uri, List<? extends NameValuePair> fields) {
    requireOrigin(uri, origins);
    HttpPost request = new HttpPost(uri);
    request.setHeader("Cache-Control", "no-store");
    request.setHeader("Cookie", "timezoneoffset=0");
    request.setEntity(new UrlEncodedFormEntity(fields, StandardCharsets.UTF_8));
    return executor.submitCompletable(() -> response(request, true));
  }

  /**
   * Rejects foreign origins and URL credentials before connection or redirect execution. Apache
   * normalizes omitted default ports on both sides of the comparison.
   *
   * @param uri absolute source URI
   * @param origins this provider's configured native HTTP origins
   */
  public static void requireOrigin(URI uri, Set<HttpHost> origins) {
    if (uri.getUserInfo() != null
        || uri.getFragment() != null
        || uri.getHost() == null
        || !("http".equalsIgnoreCase(uri.getScheme())
            || "https".equalsIgnoreCase(uri.getScheme()))) {
      throw new IllegalArgumentException("Unsupported provider origin");
    }
    HttpHost destination =
        RoutingSupport.normalize(HttpHost.create(uri), DefaultSchemePortResolver.INSTANCE);
    if (origins.stream()
        .map(origin -> RoutingSupport.normalize(origin, DefaultSchemePortResolver.INSTANCE))
        .noneMatch(destination::equals)) {
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
    return response(request).body();
  }

  /**
   * Preserves native redirects and cache status while bounding the complete decoded body.
   *
   * @param request one native request with caller-selected cache policy
   * @return actual response context
   * @throws IOException for status, transport or size failures
   */
  private Response response(HttpUriRequestBase request) throws IOException {
    return response(request, false);
  }

  /**
   * Applies the page-only document boundary before reading an entity stream.
   *
   * @param request native request
   * @param page whether binary document bodies are forbidden
   * @return complete allowed content and native response metadata
   * @throws IOException for forbidden content, status, transport or size failures
   */
  private Response response(HttpUriRequestBase request, boolean page) throws IOException {
    HttpCacheContext context = HttpCacheContext.create();
    byte[] body =
        http.execute(
            request,
            context,
            response -> {
              if (response.getCode() < 200 || response.getCode() >= 300) {
                request.cancel();
                throw new HttpResponseException(response.getCode(), "Provider read failed");
              }
              if (response.getEntity() == null) return new byte[0];
              String type = response.getEntity().getContentType();
              if (page
                  && type != null
                  && (type.toLowerCase(Locale.ROOT).startsWith("application/pdf")
                      || type.toLowerCase(Locale.ROOT).startsWith("application/octet-stream"))) {
                request.cancel();
                throw new IOException("Binary document bodies are not collection pages");
              }
              try (InputStream content = response.getEntity().getContent()) {
                byte[] bytes = content.readNBytes(maxResponseBytes);
                if (content.read() != -1) {
                  request.cancel();
                  throw new IOException("Provider response exceeds the configured byte limit");
                }
                return bytes;
              }
            });
    URI actual;
    try {
      actual = request.getUri();
    } catch (URISyntaxException failure) {
      throw new IOException("Invalid source URL", failure);
    }
    if (context.getRedirectLocations() != null && context.getRedirectLocations().size() > 0)
      actual = context.getRedirectLocations().get(context.getRedirectLocations().size() - 1);
    CacheResponseStatus status = context.getCacheResponseStatus();
    return new Response(
        body,
        actual,
        status == null
            || status == CacheResponseStatus.CACHE_MISS
            || Boolean.TRUE.equals(context.getAttribute(SUPPLIER_BODY)));
  }

  /** Stops bounded pending work and releases native HTTP resources when the application closes. */
  @Override
  public void close() throws IOException {
    executor.shutdown();
    http.close();
  }
}
