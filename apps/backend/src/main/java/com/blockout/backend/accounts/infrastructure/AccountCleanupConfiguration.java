package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.OriginalTargetCleanup;
import com.blockout.backend.config.SecurityProperties;
import java.util.Optional;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.boot.http.client.HttpRedirects;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Native provider transports and explicit disabled-by-default cleanup activation; no startup I/O.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AccountCleanupProperties.class)
public class AccountCleanupConfiguration {
  /**
   * Creates the owned RevenueCat transport without redirects or automatic 429/503/I/O retries.
   *
   * @param properties positive feature-owned deadlines
   * @return Spring-managed native HTTP factory
   */
  @Bean(destroyMethod = "destroy")
  HttpComponentsClientHttpRequestFactory revenueCatCleanupRequests(
      AccountCleanupProperties properties) {
    return ClientHttpRequestFactoryBuilder.httpComponents()
        .withHttpClientCustomizer(builder -> builder.disableAutomaticRetries())
        .build(
            HttpClientSettings.defaults()
                .withTimeouts(properties.connectTimeout(), properties.readTimeout())
                .withRedirects(HttpRedirects.DONT_FOLLOW));
  }

  /**
   * Reuses the official shared Management SDK and exact validated environment issuer.
   *
   * @param management optional configured SDK
   * @param properties explicitly activated scope
   * @param security accepted original issuer
   * @return scoped Auth0 cleanup boundary
   */
  @Bean
  AccountCleanup.Auth0 auth0AccountCleanup(
      Optional<ManagementApi> management,
      AccountCleanupProperties properties,
      SecurityProperties security) {
    return new Auth0AccountCleanup(management, properties, security.issuer().toString());
  }

  /**
   * Uses ordinary Spring HTTP because no backend RevenueCat SDK is installed.
   *
   * @param builder native application HTTP builder
   * @param revenueCatCleanupRequests owned bounded transport
   * @param properties exact project and private server credential
   * @return non-polling v2 customer cleanup boundary
   */
  @Bean
  AccountCleanup.RevenueCat revenueCatAccountCleanup(
      RestClient.Builder builder,
      HttpComponentsClientHttpRequestFactory revenueCatCleanupRequests,
      AccountCleanupProperties properties) {
    return new RevenueCatAccountCleanup(
        builder
            .clone()
            .requestFactory(revenueCatCleanupRequests)
            .baseUrl(properties.revenueCatBaseUrl().toString())
            .build(),
        properties);
  }

  /**
   * Builds the one post-commit orchestration owner and its safe private environment category.
   *
   * @param auth0 bounded Auth0 adapter
   * @param revenueCat bounded RevenueCat adapter
   * @param properties explicit operation environment
   * @return independent original-target attempts with private failure diagnostics
   */
  @Bean
  OriginalTargetCleanup originalTargetCleanup(
      AccountCleanup.Auth0 auth0,
      AccountCleanup.RevenueCat revenueCat,
      AccountCleanupProperties properties) {
    return new OriginalTargetCleanup(
        auth0, revenueCat, properties.environment().name().toLowerCase(java.util.Locale.ROOT));
  }
}
