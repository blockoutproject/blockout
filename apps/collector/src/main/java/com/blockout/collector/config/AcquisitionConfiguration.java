package com.blockout.collector.config;

import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.ChainElement;
import org.apache.hc.client5.http.impl.DefaultHttpRequestRetryStrategy;
import org.apache.hc.client5.http.impl.DefaultRedirectStrategy;
import org.apache.hc.client5.http.impl.cache.CacheConfig;
import org.apache.hc.client5.http.impl.cache.CachingHttpClients;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.HttpException;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.HttpRequest;
import org.apache.hc.core5.http.HttpResponse;
import org.apache.hc.core5.http.protocol.HttpContext;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Native, independent FFVB/LNV/IGN budgets shared across seasons and acquisition families. */
@Configuration(proxyBeanMethods = false)
public class AcquisitionConfiguration {
  /**
   * Schedules discovery, competition and current-work ticks independently with native shutdown.
   *
   * @param clock application clock, also used by source observation
   * @return managed three-thread timer; each lenient trigger skips its own overruns
   */
  @Bean
  ThreadPoolTaskScheduler acquisitionTimer(Clock clock) {
    ThreadPoolTaskScheduler timer = new ThreadPoolTaskScheduler();
    timer.setPoolSize(3);
    timer.setClock(clock);
    timer.setThreadNamePrefix("acquisition-tick-");
    return timer;
  }

  /**
   * Bounds passage admission independently from provider request pools, without a catch-up queue.
   *
   * @param properties existing conservative per-provider concurrency budget
   * @return managed executor; saturation refuses work before backend admission
   */
  @Bean
  ThreadPoolTaskExecutor acquisitionExecutor(AcquisitionProperties properties) {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    int capacity = properties.concurrencyPerProvider() * 3;
    executor.setCorePoolSize(capacity);
    executor.setMaxPoolSize(capacity);
    executor.setQueueCapacity(0);
    executor.setThreadNamePrefix("acquisition-passage-");
    return executor;
  }

  /**
   * Shares the native authenticated transport for qualified source proposals.
   *
   * @param client existing generated transport
   * @return generated source discovery operations
   */
  @Bean
  CollectionApi collectionApi(ApiClient client) {
    return new CollectionApi(client);
  }

  /**
   * Shares the authenticated native transport with the seven sporting operations.
   *
   * @param client native authenticated ingestion transport
   * @return generated seven-operation sporting client
   */
  @Bean
  SportingApi sportingApi(ApiClient client) {
    return new SportingApi(client);
  }

  /**
   * Supplies observation timestamps independently from logical read order.
   *
   * @return host clock used only for actual observation/completion timestamps
   */
  @Bean
  Clock acquisitionClock() {
    return Clock.systemUTC();
  }

  /**
   * Uses the existing authenticated ingestion transport for collector operations.
   *
   * @param client existing generated and authenticated ingestion transport
   * @return generated collector operations, with no additional HTTP stack
   */
  @Bean
  CollectorOperationsApi collectorOperationsApi(ApiClient client) {
    return new CollectorOperationsApi(client);
  }

  /**
   * Shares FFVB transport across competition and club reads.
   *
   * @param properties validated acquisition limits
   * @return context-owned FFVB client
   */
  @Bean
  public ProviderHttpClient ffvbProviderClient(AcquisitionProperties properties) {
    return client("ffvb", properties.ffvbOrigins(), properties);
  }

  /**
   * Shares LNV transport across its official page and image origins.
   *
   * @param properties validated acquisition limits
   * @return context-owned LNV client
   */
  @Bean
  public ProviderHttpClient lnvProviderClient(AcquisitionProperties properties) {
    return client("lnv", properties.lnvOrigins(), properties);
  }

  /**
   * Isolates municipal requests from sporting-provider capacity.
   *
   * @param properties validated acquisition limits
   * @return context-owned IGN client
   */
  @Bean
  public ProviderHttpClient ignProviderClient(AcquisitionProperties properties) {
    return client("ign", properties.ignOrigins(), properties);
  }

  /**
   * Wires native bounded pools, queue, permits and retries; no scheduling or provider call starts
   * here.
   *
   * @param name finite provider budget name
   * @param allowedOrigins configured exact origins including allowed redirect destinations
   * @param properties validated budgets
   * @return client owning its executor and pooled connections
   */
  private ProviderHttpClient client(
      String name, List<String> allowedOrigins, AcquisitionProperties properties) {
    Set<HttpHost> origins =
        allowedOrigins.stream()
            .map(URI::create)
            .map(HttpHost::create)
            .collect(Collectors.toUnmodifiableSet());
    RateLimiter limiter =
        RateLimiter.of(
            name,
            RateLimiterConfig.custom()
                .limitForPeriod(properties.permitsPerPeriod())
                .limitRefreshPeriod(properties.refreshPeriod())
                .timeoutDuration(properties.permitTimeout())
                .build());
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(properties.concurrencyPerProvider());
    executor.setMaxPoolSize(properties.concurrencyPerProvider());
    executor.setQueueCapacity(properties.queueCapacityPerProvider());
    executor.setThreadNamePrefix("acquisition-" + name + "-");
    executor.initialize();
    HttpClientBuilder builder =
        name.equals("lnv")
            ? CachingHttpClients.custom()
                .setCacheConfig(
                    CacheConfig.custom()
                        .setMaxCacheEntries(128)
                        .setMaxObjectSize(Math.min(properties.maxResponseBytes(), 5L * 1024 * 1024))
                        .setHeuristicCachingEnabled(false)
                        .setAsynchronousWorkers(0)
                        .setStaleIfErrorEnabled(false)
                        .build())
            : HttpClients.custom();
    CloseableHttpClient http =
        builder
            .disableCookieManagement()
            .addResponseInterceptorLast(
                (response, entity, context) ->
                    context.setAttribute(
                        ProviderHttpClient.SUPPLIER_BODY,
                        response.getCode() >= 200 && response.getCode() < 300))
            .setConnectionManager(
                PoolingHttpClientConnectionManagerBuilder.create()
                    .setMaxConnTotal(properties.concurrencyPerProvider())
                    .setMaxConnPerRoute(properties.concurrencyPerProvider())
                    .setDefaultConnectionConfig(
                        ConnectionConfig.custom()
                            .setConnectTimeout(Timeout.of(properties.timeout()))
                            .setSocketTimeout(Timeout.of(properties.timeout()))
                            .build())
                    .build())
            .setDefaultRequestConfig(
                RequestConfig.custom()
                    .setConnectionRequestTimeout(Timeout.of(properties.timeout()))
                    .setResponseTimeout(Timeout.of(properties.timeout()))
                    .setRedirectsEnabled(properties.maxRedirects() > 0)
                    .setMaxRedirects(properties.maxRedirects())
                    .build())
            .setRetryStrategy(new DefaultHttpRequestRetryStrategy(2, TimeValue.ofSeconds(1)))
            .setRedirectStrategy(
                new DefaultRedirectStrategy() {
                  /** Checks the native resolved location before Apache follows it. */
                  @Override
                  public URI getLocationURI(
                      HttpRequest request, HttpResponse response, HttpContext context)
                      throws HttpException {
                    URI destination = super.getLocationURI(request, response, context);
                    ProviderHttpClient.requireOrigin(destination, origins);
                    return destination;
                  }
                })
            .addExecInterceptorBefore(
                ChainElement.CONNECT.name(),
                "provider-exchange",
                (request, scope, chain) -> {
                  RateLimiter.waitForPermission(limiter);
                  return chain.proceed(request, scope);
                })
            .build();
    return new ProviderHttpClient(http, executor, origins, properties.maxResponseBytes());
  }
}
