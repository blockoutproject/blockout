package com.blockout.backend.support.infrastructure;

import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportValidation;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.boot.http.client.HttpRedirects;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Wires the bounded support adapters without making a provider request at startup. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SupportProperties.class)
public class SupportConfiguration {
  /**
   * Uses the process temporary directory without introducing a persistent support volume.
   *
   * @return validation owner; successful snapshots must be closed by their consuming use case
   */
  @Bean
  SupportValidation supportValidation() {
    return new SupportValidation(Path.of(System.getProperty("java.io.tmpdir")));
  }

  /**
   * Uses Boot's native connection/read settings and refuses redirects and automatic write retries.
   * Qualifier-only injection keeps this private transport out of other features' client selection.
   *
   * @param properties support-owned HTTP waits
   * @return native factory disposed by Spring at shutdown
   */
  @Bean(destroyMethod = "destroy", defaultCandidate = false)
  HttpComponentsClientHttpRequestFactory supportRequests(SupportProperties properties) {
    return ClientHttpRequestFactoryBuilder.httpComponents()
        .withHttpClientCustomizer(builder -> builder.disableAutomaticRetries())
        .build(
            HttpClientSettings.defaults()
                .withTimeouts(properties.connectTimeout(), properties.readTimeout())
                .withRedirects(HttpRedirects.DONT_FOLLOW));
  }

  /**
   * Keeps the GitHub origin fixed; submitted metadata never selects a destination or credential.
   *
   * @param builder Boot-owned instrumented HTTP builder
   * @param requests bounded support factory
   * @param properties fixed private repository settings
   * @return private case adapter, refusing sends while unconfigured
   */
  @Bean
  SupportCases supportCases(
      RestClient.Builder builder,
      @Qualifier("supportRequests") HttpComponentsClientHttpRequestFactory requests,
      SupportProperties properties) {
    return new GitHubSupportClient(
        builder.clone().requestFactory(requests).baseUrl("https://api.github.com").build(),
        properties.destination());
  }

  /**
   * Uses only the packaged CLI and server settings; temporary originals belong to the validated
   * send.
   *
   * @param properties fixed destination and process wait
   * @return one-invocation attachment adapter
   */
  @Bean
  SupportAttachments supportAttachments(SupportProperties properties) {
    return new GitHubAttachmentProcess(properties);
  }

  /**
   * Uses a separate client without GitHub credentials for the private generic webhook.
   *
   * @param builder Boot-owned HTTP builder
   * @param requests bounded support factory
   * @param properties fixed webhook and request-list destination
   * @param diagnostics existing native logging boundary
   * @return secondary signal that never changes receipt acceptance
   */
  @Bean
  SupportSignal supportSignal(
      RestClient.Builder builder,
      @Qualifier("supportRequests") HttpComponentsClientHttpRequestFactory requests,
      SupportProperties properties,
      SupportDiagnostics diagnostics) {
    return new DiscordSupportSignal(
        builder.clone().requestFactory(requests).build(), properties.destination(), diagnostics);
  }
}
