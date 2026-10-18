package com.blockout.collector.ingestion;

import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.atlassian.oai.validator.springweb.client.OpenApiValidationClientHttpRequestInterceptor;
import com.blockout.collector.generated.ingestion.ApiClient;
import io.micrometer.observation.ObservationRegistry;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Qualifies raw ingestion responses before generated decoding, without provider retry semantics.
 */
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
   * Validates the canonical bundle, including required nullable fields lost by DTO annotations. The
   * native interceptor buffers the validated response for generated Jackson decoding.
   *
   * @param factory bounded HTTP transport
   * @param observations native registry for low-cardinality HTTP metrics
   * @param properties validated backend URL supplied by deployment configuration
   * @param authentication native client-credentials interceptor
   * @return generated client with native client-credentials authentication and response validation
   * @throws IOException when the bundled contract cannot be read
   */
  @Bean
  ApiClient ingestionApiClient(
      HttpComponentsClientHttpRequestFactory factory,
      ObservationRegistry observations,
      IngestionProperties properties,
      @Qualifier("ingestionAuthentication") ClientHttpRequestInterceptor authentication)
      throws IOException {
    OpenApiValidationClientHttpRequestInterceptor validation =
        new OpenApiValidationClientHttpRequestInterceptor(
            OpenApiInteractionValidator.createForInlineApiSpecification(
                    new ClassPathResource("contracts/ingestion.yaml")
                        .getContentAsString(StandardCharsets.UTF_8))
                .build());
    RestClient restClient =
        ApiClient.buildRestClientBuilder()
            .requestFactory(factory)
            .observationRegistry(observations)
            .requestInterceptor(authentication)
            .requestInterceptor(
                (request, body, execution) -> {
                  try {
                    return validation.intercept(request, body, execution);
                  } catch (
                      OpenApiValidationClientHttpRequestInterceptor.OpenApiValidationException
                          exception) {
                    // Its report contains received values. Keep it out of exceptions and
                    // operational logs.
                    throw new RestClientException("Invalid ingestion HTTP exchange");
                  }
                })
            .build();
    ApiClient client = new ApiClient(restClient);
    client.setBasePath(properties.baseUrl());
    return client;
  }
}
