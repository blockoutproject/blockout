package com.blockout.backend.search.infrastructure;

import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.nio.PoolingAsyncClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.ClientTlsStrategyBuilder;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.util.Timeout;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.transport.OpenSearchTransport;
import org.opensearch.client.transport.httpclient5.ApacheHttpClient5TransportBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.ssl.SslBundles;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Opt-in native search connection; construction performs no engine call or projection work. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "blockout.search", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(OpenSearchProperties.class)
public class OpenSearchConfiguration {
  /**
   * Creates a bounded Apache transport with native certificate and hostname verification.
   *
   * @param properties validated backend connection and credential settings
   * @param bundles Boot-owned trust configuration
   * @return transport closed by Spring when the application stops
   */
  @Bean(destroyMethod = "close")
  OpenSearchTransport openSearchTransport(OpenSearchProperties properties, SslBundles bundles) {
    HttpHost host = HttpHost.create(properties.endpoint());
    BasicCredentialsProvider credentials = new BasicCredentialsProvider();
    credentials.setCredentials(
        new AuthScope(host),
        new UsernamePasswordCredentials(
            properties.username(), properties.password().toCharArray()));
    return ApacheHttpClient5TransportBuilder.builder(host)
        .setHttpClientConfigCallback(
            client ->
                client
                    .setDefaultCredentialsProvider(credentials)
                    .setConnectionManager(
                        PoolingAsyncClientConnectionManagerBuilder.create()
                            .setDefaultConnectionConfig(
                                ConnectionConfig.custom()
                                    .setConnectTimeout(
                                        Timeout.ofMilliseconds(properties.connectTimeoutMillis()))
                                    .setSocketTimeout(
                                        Timeout.ofMilliseconds(properties.requestTimeoutMillis()))
                                    .build())
                            .setTlsStrategy(
                                ClientTlsStrategyBuilder.create()
                                    .setSslContext(
                                        bundles
                                            .getBundle(properties.sslBundle())
                                            .createSslContext())
                                    .buildAsync())
                            .build()))
        .setRequestConfigCallback(
            request ->
                request
                    .setConnectionRequestTimeout(
                        Timeout.ofMilliseconds(properties.connectTimeoutMillis()))
                    .setResponseTimeout(Timeout.ofMilliseconds(properties.requestTimeoutMillis())))
        .build();
  }

  /**
   * Exposes the official client without replacing its serialization or query model.
   *
   * @param transport lifecycle-managed native transport
   * @return typed client for search infrastructure adapters
   */
  @Bean
  OpenSearchClient openSearchClient(OpenSearchTransport transport) {
    return new OpenSearchClient(transport);
  }
}
