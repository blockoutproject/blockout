package com.blockout.collector.acquisition.infrastructure.provider;

import com.blockout.collector.acquisition.application.ProviderPages;
import com.blockout.collector.acquisition.application.ProviderResponse;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.NameValuePair;

/**
 * Synchronous provider reads through native pooled connections; parsing requires complete bounded
 * content.
 */
@RequiredArgsConstructor
public final class ProviderHttpClient implements ProviderPages, AutoCloseable {
  /** Per-exchange native protocol evidence; distinguishes 200 revalidation from 304 reuse. */
  public static final String SUPPLIER_BODY = "blockout.supplier-body";

  private final CloseableHttpClient http;
  private final Set<HttpHost> origins;
  private final int maxResponseBytes;
  private final List<Header> pageHeaders;

  /** {@inheritDoc} */
  @Override
  public ProviderResponse page(URI uri) {
    requireOrigin(uri, origins);
    return pageResponse(new HttpGet(uri));
  }

  /**
   * Reads a resource under its client's native HTTP cache policy.
   *
   * @param uri qualified published resource URL
   * @return bounded response without treating cache reuse as a new observation, or a direct
   *     acquisition failure
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws UncheckedIOException for transport, status or complete-body failure
   * @throws RequestNotPermitted when the finite provider permit wait is exhausted or interrupted
   */
  public ProviderResponse get(URI uri) {
    requireOrigin(uri, origins);
    return response(new HttpGet(uri));
  }

  /** Status and bounded body for responses the source accepts for interpretation. */
  public record StatusResponse(int status, byte[] body) {}

  /**
   * Reads a native GET with explicitly accepted statuses after ordinary retries and redirects.
   *
   * @param request source request with its representation headers
   * @param acceptedStatuses statuses the source can interpret
   * @return actual status and bounded body
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws UncheckedIOException for transport, status or complete-body failure
   * @throws RequestNotPermitted when the finite provider permit wait is exhausted or interrupted
   */
  public StatusResponse readStatus(HttpGet request, Set<Integer> acceptedStatuses) {
    try {
      requireOrigin(requestUri(request), origins);
      return http.execute(
          request,
          response -> {
            int status = response.getCode();
            if (!acceptedStatuses.contains(status)) {
              request.cancel();
              throw new HttpResponseException(status, "Provider read failed");
            }
            return new StatusResponse(status, boundedBody(request, response.getEntity()));
          });
    } catch (IOException failure) {
      throw new UncheckedIOException("Provider read failed", failure);
    }
  }

  /**
   * Sends a repeatable ordinary form POST; Apache retains its native method/retry rules.
   *
   * @param uri official form action
   * @param fields qualified source form fields, never copied to diagnostics
   * @param charset native form encoding
   * @return complete decompressed response, or a direct acquisition failure
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws UncheckedIOException for transport, status or complete-body failure
   * @throws RequestNotPermitted when the finite provider permit wait is exhausted or interrupted
   */
  public byte[] post(URI uri, List<? extends NameValuePair> fields, Charset charset) {
    return response(form(uri, fields, charset)).body();
  }

  /**
   * Reads a native document form response, refusing declared PDF or octet-stream entities before
   * body consumption.
   *
   * @param uri qualified match form action
   * @param fields ephemeral published form state
   * @param charset native form encoding
   * @return final allowed response context, or a direct acquisition failure
   * @throws IllegalArgumentException for an unsupported origin or embedded credentials
   * @throws UncheckedIOException for transport, status or complete-body failure
   * @throws RequestNotPermitted when the finite provider permit wait is exhausted or interrupted
   */
  public ProviderResponse postPage(URI uri, List<? extends NameValuePair> fields, Charset charset) {
    return pageResponse(form(uri, fields, charset));
  }

  private ProviderResponse pageResponse(HttpUriRequestBase request) {
    request.setHeader("Cache-Control", "no-store");
    pageHeaders.forEach(request::setHeader);
    return response(request, true);
  }

  private HttpPost form(URI uri, List<? extends NameValuePair> fields, Charset charset) {
    requireOrigin(uri, origins);
    HttpPost request = new HttpPost(uri);
    request.setEntity(new UrlEncodedFormEntity(fields, charset));
    return request;
  }

  /**
   * Rejects foreign origins and URL credentials before connection or redirect execution. Apache
   * normalizes omitted default ports on both sides of the comparison.
   *
   * @param uri absolute source URI
   * @param origins this provider's configured native HTTP origins
   * @throws IllegalArgumentException for credentials, a fragment, a non-HTTP URL or a foreign
   *     origin
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
   * Preserves native redirects and cache status while bounding the complete decoded body.
   *
   * @param request one native request with caller-selected cache policy
   * @return actual response context
   * @throws UncheckedIOException for status, transport or size failures
   */
  private ProviderResponse response(HttpUriRequestBase request) {
    return response(request, false);
  }

  /**
   * Applies the page-only document boundary before reading an entity stream.
   *
   * @param request native request
   * @param page whether binary document bodies are forbidden
   * @return complete allowed content and native response metadata
   * @throws UncheckedIOException for forbidden content, status, transport or size failures
   */
  private ProviderResponse response(HttpUriRequestBase request, boolean page) {
    try {
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
                if (response.getEntity() == null) {
                  return new byte[0];
                }
                String type = response.getEntity().getContentType();
                if (page
                    && type != null
                    && (type.toLowerCase(Locale.ROOT).startsWith("application/pdf")
                        || type.toLowerCase(Locale.ROOT).startsWith("application/octet-stream"))) {
                  request.cancel();
                  throw new IOException("Binary document bodies are not collection pages");
                }
                return boundedBody(request, response.getEntity());
              });
      URI actual = requestUri(request);
      if (context.getRedirectLocations() != null && context.getRedirectLocations().size() > 0) {
        actual = context.getRedirectLocations().get(context.getRedirectLocations().size() - 1);
      }
      CacheResponseStatus status = context.getCacheResponseStatus();
      return new ProviderResponse(
          body,
          actual,
          status == null
              || status == CacheResponseStatus.CACHE_MISS
              || Boolean.TRUE.equals(context.getAttribute(SUPPLIER_BODY)));
    } catch (IOException failure) {
      throw new UncheckedIOException("Provider read failed", failure);
    }
  }

  private URI requestUri(HttpUriRequestBase request) throws IOException {
    try {
      return request.getUri();
    } catch (URISyntaxException failure) {
      throw new IOException("Invalid source URL", failure);
    }
  }

  /**
   * Bounds decompressed success/error bytes before a provider interpreter can inspect them.
   *
   * @param request active native request, cancelled on overflow
   * @param entity received entity, possibly absent
   * @return complete bytes, including an explicitly empty entity
   * @throws IOException for stream failure or decoded overflow
   */
  private byte[] boundedBody(HttpUriRequestBase request, HttpEntity entity) throws IOException {
    if (entity == null) {
      return new byte[0];
    }
    try (InputStream content = entity.getContent()) {
      byte[] bytes = content.readNBytes(maxResponseBytes);
      if (content.read() != -1) {
        request.cancel();
        throw new IOException("Provider response exceeds the configured byte limit");
      }
      return bytes;
    }
  }

  /**
   * {@inheritDoc}
   *
   * <p>Closes native pooled connections when the application closes. Callers own execution and
   * interruption; permit waiting retains its configured finite bound.
   *
   * @throws IOException when native HTTP resource shutdown fails
   */
  @Override
  public void close() throws IOException {
    http.close();
  }
}
