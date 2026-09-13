package com.blockout.backend.identity.subscription.infrastructure.revenuecat;

import com.blockout.backend.identity.config.RevenueCatProperties;
import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.identity.subscription.domain.BillingEnvironment;
import com.blockout.backend.identity.subscription.domain.SubscriptionFailure;
import io.github.resilience4j.ratelimiter.*;
import io.micrometer.core.instrument.MeterRegistry;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;

/** Read-only V2 adapter; complete environment-specific evidence is the only source of decisions. */
@Slf4j
public final class RevenueCatSubscriptions implements SubscriptionProvider, AutoCloseable {
  private final AtomicBoolean degraded = new AtomicBoolean();
  private final RevenueCatProperties properties;
  private final Clock clock;
  private final MeterRegistry metrics;
  private final HttpClient http;
  private final RestClient client;
  private final RateLimiter limiter;
  private final AtomicReference<Instant> pausedUntil = new AtomicReference<>(Instant.MIN);

  /**
   * Creates bounded HTTP reads with one process-wide limiter for this provider.
   *
   * @param properties validated worker credentials and entitlement
   * @param clock shared pause/observation clock
   * @param metrics bounded integration diagnostics
   */
  public RevenueCatSubscriptions(
      RevenueCatProperties properties, Clock clock, MeterRegistry metrics) {
    this.properties = properties;
    this.clock = clock;
    this.metrics = metrics;
    http =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
    factory.setReadTimeout(Duration.ofSeconds(5));
    client =
        RestClient.builder()
            .requestFactory(factory)
            .defaultHeader("Authorization", "Bearer " + properties.secretKey())
            .build();
    limiter =
        RateLimiter.of(
            "revenuecat",
            RateLimiterConfig.custom()
                .limitForPeriod(1)
                .limitRefreshPeriod(Duration.ofMillis(500))
                .timeoutDuration(Duration.ofSeconds(2))
                .build());
  }

  /** {@inheritDoc} */
  @Override
  public SubscriptionObservation read(BillingBinding binding) throws InterruptedException {
    long started = System.nanoTime();
    try {
      String path =
          "/v2/projects/"
              + segment(binding.projectId())
              + "/customers/"
              + segment(binding.customerId())
              + "/subscriptions";
      List<JsonNode> subscriptions =
          pages(
              URI.create(properties.baseUrl())
                  .resolve(path + "?environment=" + binding.environment().value() + "&limit=100"),
              path,
              binding.environment());
      boolean positive = false;
      Instant periodEnd = null;
      for (JsonNode subscription : subscriptions) {
        if (!subscription.path("environment").asText().equals(binding.environment().value()))
          throw new InvalidEvidence();
        if (!subscription.path("gives_access").isBoolean()) throw new InvalidEvidence();
        String id = requiredText(subscription, "id");
        JsonNode entitlements = subscription.path("entitlements");
        List<JsonNode> all = items(entitlements);
        String entitlementPath =
            "/v2/projects/"
                + segment(binding.projectId())
                + "/subscriptions/"
                + segment(id)
                + "/entitlements";
        URI next = next(entitlements, entitlementPath);
        if (next != null) all.addAll(pages(next, entitlementPath, null));
        all.forEach(e -> requiredText(e, "id"));
        boolean pro =
            all.stream().anyMatch(e -> properties.entitlementId().equals(requiredText(e, "id")));
        if (subscription.path("gives_access").asBoolean() && pro) {
          positive = true;
          JsonNode end = subscription.path("ends_at");
          if (end.isIntegralNumber()) {
            Instant candidate = Instant.ofEpochMilli(end.asLong());
            if (candidate.isAfter(clock.instant())
                && (periodEnd == null || candidate.isBefore(periodEnd))) periodEnd = candidate;
          }
        }
      }
      metrics
          .counter(
              "blockout.subscription.provider.results",
              "result",
              positive ? "positive" : "negative")
          .increment();
      if (degraded.compareAndSet(true, false))
        log.atInfo()
            .addKeyValue("event.action", "subscription.provider.recovered")
            .log("Subscription verification recovered");
      return new SubscriptionObservation.Verified(positive, periodEnd);
    } catch (ProviderPaused paused) {
      metrics.counter("blockout.subscription.provider.suppressed").increment();
      return new SubscriptionObservation.Failed(
          SubscriptionFailure.UNAVAILABLE, paused.delay, false);
    } catch (RestClientResponseException response) {
      int status = response.getStatusCode().value();
      if (status == 429) {
        String value =
            response.getResponseHeaders() == null
                ? null
                : response.getResponseHeaders().getFirst("Retry-After");
        Duration delay = retryAfter(value);
        Instant until = clock.instant().plus(delay);
        pausedUntil.accumulateAndGet(until, (a, b) -> a.isAfter(b) ? a : b);
        metrics.counter("blockout.subscription.provider.rate.limited").increment();
        return failure(SubscriptionFailure.UNAVAILABLE, delay, false);
      }
      if (status == 401 || status == 403)
        return failure(SubscriptionFailure.CONFIGURATION, Duration.ZERO, true);
      if (status == 404) return failure(SubscriptionFailure.NOT_FOUND, Duration.ZERO, true);
      return failure(
          status >= 500 ? SubscriptionFailure.UNAVAILABLE : SubscriptionFailure.INVALID_RESPONSE,
          Duration.ZERO,
          status < 500);
    } catch (InvalidEvidence | IllegalArgumentException _) {
      return failure(SubscriptionFailure.INVALID_RESPONSE, Duration.ZERO, true);
    } catch (RestClientException unavailable) {
      if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
      return failure(
          unavailable instanceof ResourceAccessException
              ? SubscriptionFailure.UNAVAILABLE
              : SubscriptionFailure.INVALID_RESPONSE,
          Duration.ZERO,
          !(unavailable instanceof ResourceAccessException));
    } finally {
      metrics
          .timer("blockout.subscription.provider.duration")
          .record(Duration.ofNanos(System.nanoTime() - started));
    }
  }

  /**
   * Traverses validated page links without exposing credentials to a foreign origin or path.
   *
   * @param first first page URI
   * @param path exact allowed resource path
   * @param environment enforced subscription environment, null for entitlement pages
   * @return complete item collection
   * @throws InterruptedException on worker cancellation
   */
  private List<JsonNode> pages(URI first, String path, BillingEnvironment environment)
      throws InterruptedException {
    List<JsonNode> values = new ArrayList<>();
    Set<URI> visited = new HashSet<>();
    URI page = first;
    while (page != null) {
      if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
      if (!visited.add(page)) throw new InvalidEvidence();
      if (!limiter.acquirePermission()) {
        if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
        throw new InvalidEvidence();
      }
      Duration remaining = Duration.between(clock.instant(), pausedUntil.get());
      if (!remaining.isNegative() && !remaining.isZero()) throw new ProviderPaused(remaining);
      if (environment != null)
        page =
            UriComponentsBuilder.fromUri(page)
                .replaceQueryParam("environment", environment.value())
                .build(true)
                .toUri();
      metrics.counter("blockout.subscription.provider.requests").increment();
      JsonNode body = client.get().uri(page).retrieve().body(JsonNode.class);
      values.addAll(items(body));
      page = next(body, path);
    }
    return values;
  }

  /**
   * Validates the provider's required list shape once per page.
   *
   * @param page provider page
   * @return mutable items for bounded traversal
   */
  private static List<JsonNode> items(JsonNode page) {
    if (page == null || !page.path("items").isArray()) throw new InvalidEvidence();
    List<JsonNode> values = new ArrayList<>();
    page.path("items").forEach(values::add);
    return values;
  }

  /**
   * Resolves a provider link only inside the current resource and configured origin.
   *
   * @param page current provider page
   * @param path required resource path
   * @return next URI or null at the end
   */
  private URI next(JsonNode page, String path) {
    JsonNode field = page.path("next_page");
    if (field.isMissingNode() || field.isNull()) return null;
    if (!field.isTextual() || field.asText().isBlank()) throw new InvalidEvidence();
    URI base = URI.create(properties.baseUrl());
    URI uri = base.resolve(field.asText());
    if (!Objects.equals(base.getScheme(), uri.getScheme())
        || !Objects.equals(base.getRawAuthority(), uri.getRawAuthority())
        || !path.equals(uri.getRawPath())
        || uri.getFragment() != null
        || uri.getUserInfo() != null) throw new InvalidEvidence();
    return uri;
  }

  /**
   * Rejects missing subscription identifiers required for complete entitlement paging.
   *
   * @param value subscription object
   * @param name required field
   * @return nonblank provider identifier
   */
  private static String requiredText(JsonNode value, String name) {
    JsonNode field = value.path(name);
    if (!field.isTextual() || field.asText().isBlank()) throw new InvalidEvidence();
    return field.asText();
  }

  /**
   * Encodes one exact identifier as a path segment.
   *
   * @param value provider identifier
   * @return encoded segment
   */
  private static String segment(String value) {
    return UriComponentsBuilder.newInstance()
        .pathSegment(value)
        .build()
        .encode()
        .toUriString()
        .substring(1);
  }

  /**
   * Honors the provider's documented numeric delay, with a conservative fallback.
   *
   * @param value Retry-After seconds
   * @return positive delay
   */
  private static Duration retryAfter(String value) {
    try {
      return Duration.ofSeconds(Math.max(1, Long.parseLong(value)));
    } catch (NumberFormatException _) {
      return Duration.ofMinutes(1);
    }
  }

  /**
   * Emits a bounded outcome metric without provider exception messages.
   *
   * @param reason safe classification
   * @param delay provider minimum delay
   * @param permanent whether a new request is required
   * @return expected failure
   */
  private SubscriptionObservation.Failed failure(
      SubscriptionFailure reason, Duration delay, boolean permanent) {
    metrics
        .counter(
            "blockout.subscription.provider.results",
            "result",
            reason.name().toLowerCase(Locale.ROOT))
        .increment();
    if ((reason == SubscriptionFailure.UNAVAILABLE || reason == SubscriptionFailure.CONFIGURATION)
        && degraded.compareAndSet(false, true))
      log.atWarn()
          .addKeyValue("event.action", "subscription.provider.unavailable")
          .addKeyValue("outcome", reason.name())
          .log("Subscription verification unavailable");
    return new SubscriptionObservation.Failed(reason, delay, permanent);
  }

  /** {@inheritDoc} */
  @Override
  public void close() {
    http.close();
  }

  /** Stops incomplete evidence traversal; never includes provider data. */
  private static final class InvalidEvidence extends RuntimeException {
    private static final long serialVersionUID = 1L;
  }

  /** Carries the shared provider retry deadline to the durable queue. */
  @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
  private static final class ProviderPaused extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /** Remaining shared provider pause. */
    private final Duration delay;
  }
}
