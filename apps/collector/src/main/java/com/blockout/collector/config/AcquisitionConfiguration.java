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
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.HttpException;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.HttpRequest;
import org.apache.hc.core5.http.HttpResponse;
import org.apache.hc.core5.http.protocol.HttpContext;
import org.apache.hc.core5.io.CloseMode;
import org.apache.hc.core5.io.ModalCloseable;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Native, independent FFVB/LNV/IGN budgets shared across seasons and acquisition families. */
@Configuration(proxyBeanMethods = false)
public class AcquisitionConfiguration {
  /**
   * Shares the authenticated native transport with source qualification.
   *
   * @param client native authenticated ingestion transport
   * @return generated source-qualification operations
   */
  @Bean
  CollectionApi collectionSourcesApi(ApiClient client) {
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
   * @param client existing validated and authenticated ingestion transport
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
    CloseableHttpClient http =
        HttpClients.custom()
            .disableCookieManagement()
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
                  ClassicHttpResponse response = chain.proceed(request, scope);
                  if (response.getCode() >= 300 && response.getEntity() != null) {
                    // Discard unused bodies before native retries/redirects can drain them.
                    ((ModalCloseable) response).close(CloseMode.IMMEDIATE);
                    response.setEntity(null);
                  }
                  return response;
                })
            .build();
    return new ProviderHttpClient(http, executor, origins, properties.maxResponseBytes());
  }
}
