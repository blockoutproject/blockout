package com.blockout.collector.ingestion;

import com.blockout.collector.generated.ingestion.ApiClient;
import io.micrometer.observation.ObservationRegistry;
import java.time.Duration;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Configures native generated ingestion decoding without automatic business-request replay. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(IngestionProperties.class)
public class IngestionClientConfiguration {
  /**
   * Uses the native blocking transport with bounded waits and no redirects or automatic replay.
   *
   * @param properties validated maximum connect, pool lease and response wait
   * @return Spring-managed factory, closed when its application context stops
   */
  @Bean
  HttpComponentsClientHttpRequestFactory ingestionRequestFactory(IngestionProperties properties) {
    Duration timeout = properties.timeout();
    HttpComponentsClientHttpRequestFactory factory =
        new HttpComponentsClientHttpRequestFactory(
            HttpClients.custom()
                .disableAutomaticRetries()
                .disableRedirectHandling()
                .setConnectionManager(
                    PoolingHttpClientConnectionManagerBuilder.create()
                        .setDefaultConnectionConfig(
                            ConnectionConfig.custom()
                                .setConnectTimeout(Timeout.of(timeout))
                                .setSocketTimeout(Timeout.of(timeout))
                                .build())
                        .build())
                .build());
    factory.setConnectionRequestTimeout(timeout);
    factory.setReadTimeout(timeout);
    return factory;
  }

  /**
   * Uses generated Jackson decoding for backend responses. Contract constraints beyond decoding are
   * the producer's responsibility; this consumer does not perform exhaustive response validation.
   *
   * @param factory bounded HTTP transport
   * @param observations native registry for low-cardinality HTTP metrics
   * @param properties validated backend URL supplied by deployment configuration
   * @param authentication native client-credentials interceptor
   * @return generated client with native client-credentials authentication and HTTP observation
   */
  @Bean
  ApiClient ingestionApiClient(
      HttpComponentsClientHttpRequestFactory factory,
      ObservationRegistry observations,
      IngestionProperties properties,
      @Qualifier("ingestionAuthentication") ClientHttpRequestInterceptor authentication) {
    RestClient restClient =
        ApiClient.buildRestClientBuilder()
            .requestFactory(factory)
            .observationRegistry(observations)
            .requestInterceptor(authentication)
            .build();
    ApiClient client = new ApiClient(restClient);
    client.setBasePath(properties.baseUrl());
    return client;
  }
}
