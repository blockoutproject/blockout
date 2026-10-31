package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.MatchDocumentSource;
import com.blockout.backend.sporting.application.exception.MatchDocumentUnavailableException;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import okhttp3.FormBody;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Validates every destination and decoded body with native no-retry, no-cache OkHttp transport. */
@Component
@EnableConfigurationProperties(MatchDocumentProperties.class)
@Slf4j
public class MatchDocumentClient implements MatchDocumentSource {
  private final MatchDocumentProperties properties;
  private final OkHttpClient http;
  private final Set<String> origins;

  /**
   * Creates a feature-owned native pool with bounded calls, no cookies and no automatic redirects.
   *
   * @param properties validated relay limits and explicitly enabled origins
   */
  public MatchDocumentClient(MatchDocumentProperties properties) {
    this.properties = properties;
    origins =
        properties.allowedOrigins().stream()
            .map(
                uri -> {
                  HttpUrl url = HttpUrl.get(uri);
                  if (!url.encodedPath().equals("/")
                      || url.query() != null
                      || url.fragment() != null
                      || !url.username().isEmpty()
                      || !url.password().isEmpty())
                    throw new IllegalArgumentException(
                        "Document origins must contain only an HTTP(S) origin");
                  return origin(url);
                })
            .collect(Collectors.toUnmodifiableSet());
    http =
        new OkHttpClient.Builder()
            .connectTimeout(properties.connectTimeout())
            .readTimeout(properties.readTimeout())
            .writeTimeout(properties.readTimeout())
            .callTimeout(properties.connectTimeout().plus(properties.readTimeout()))
            // Native status follow-ups (e.g. 503 Retry-After: 0) are independent of connection
            // retries.
            // Reject terminal HTTP errors before OkHttp can replay the accepted GET or form POST.
            .addNetworkInterceptor(
                chain -> {
                  Response response = chain.proceed(chain.request());
                  if (response.code() >= 400) {
                    response.close();
                    throw new MatchDocumentUnavailableException();
                  }
                  return response;
                })
            .retryOnConnectionFailure(false)
            .followRedirects(false)
            .followSslRedirects(false)
            .build();
  }

  /** {@inheritDoc} */
  @Override
  public byte[] fetch(Reference reference) {
    try {
      Request.Builder request = new Request.Builder().header("Accept", "application/pdf");
      if (reference.informationSheet() != null) {
        request
            .url(properties.informationUrl().toString())
            .post(
                new FormBody.Builder()
                    .add("wss_saison", reference.informationSheet().seasonLabel())
                    .add("codmatch", reference.informationSheet().matchCode())
                    .add("codent", reference.informationSheet().organizerReference())
                    .build());
      } else request.url(reference.url().toString());
      Request current = request.build();
      for (int redirects = 0; ; redirects++) {
        requireOrigin(current.url());
        try (Response response = http.newCall(current).execute()) {
          if (Set.of(301, 302, 303, 307, 308).contains(response.code())) {
            if (redirects >= properties.maxRedirects())
              throw new MatchDocumentUnavailableException();
            String location = response.header("Location");
            HttpUrl next = location == null ? null : current.url().resolve(location);
            if (next == null || (current.url().isHttps() && !next.isHttps()))
              throw new MatchDocumentUnavailableException();
            requireOrigin(next);
            Request.Builder redirected = current.newBuilder().url(next);
            if (response.code() == 303
                || ((response.code() == 301 || response.code() == 302)
                    && current.method().equals("POST"))) redirected.get();
            current = redirected.build();
            continue;
          }
          if (!response.isSuccessful() || response.body() == null)
            throw new MatchDocumentUnavailableException();
          String type =
              response.body().contentType() == null
                  ? ""
                  : response.body().contentType().toString().split(";", 2)[0].trim();
          if (!type.equalsIgnoreCase("application/pdf")
              && !type.equalsIgnoreCase("application/octet-stream"))
            throw new MatchDocumentUnavailableException();
          byte[] bytes = response.body().byteStream().readNBytes(properties.maxBytes() + 1);
          if (bytes.length > properties.maxBytes()
              || bytes.length < 12
              || !Arrays.equals(
                  Arrays.copyOf(bytes, 5), "%PDF-".getBytes(StandardCharsets.US_ASCII))
              || !new String(
                      bytes,
                      Math.max(0, bytes.length - 1024),
                      Math.min(bytes.length, 1024),
                      StandardCharsets.ISO_8859_1)
                  .contains("%%EOF")) throw new MatchDocumentUnavailableException();
          return bytes;
        }
      }
    } catch (IOException | IllegalArgumentException | MatchDocumentUnavailableException failure) {
      log.atWarn()
          .addKeyValue("operation", "match_document")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue("reason", failure.getClass().getSimpleName())
          .log("Match PDF delivery unavailable");
      throw new MatchDocumentUnavailableException(failure);
    }
  }

  /**
   * Refuses unapproved origins and credentials before any HTTP request is dispatched.
   *
   * @param url initial or redirected destination parsed by the native HTTP client
   * @throws MatchDocumentUnavailableException when the destination is not enabled
   */
  private void requireOrigin(HttpUrl url) {
    if (!url.username().isEmpty()
        || !url.password().isEmpty()
        || url.fragment() != null
        || !origins.contains(origin(url))) throw new MatchDocumentUnavailableException();
  }

  /**
   * Uses OkHttp's normalized scheme, host and effective port for exact origin comparison.
   *
   * @param url HTTP(S) destination normalized by OkHttp
   * @return exact origin identity, independent of path and query
   */
  private static String origin(HttpUrl url) {
    return url.scheme() + "://" + url.host() + ":" + url.port();
  }

  /** Releases only this adapter's connections and dispatcher when the application closes. */
  @PreDestroy
  public void close() {
    http.connectionPool().evictAll();
    http.dispatcher().executorService().shutdown();
  }
}
