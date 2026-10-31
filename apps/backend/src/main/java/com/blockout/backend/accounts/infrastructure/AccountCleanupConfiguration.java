package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.OriginalTargetCleanup;
import com.blockout.backend.config.SecurityProperties;
import java.net.http.HttpClient;
import java.util.Optional;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Native provider transports and explicit disabled-by-default cleanup activation; no startup I/O.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AccountCleanupProperties.class)
public class AccountCleanupConfiguration {
  /**
   * Owns a native HTTP/1.1 client with redirects disabled. Transmitted POST/DELETE requests are not
   * replayed by JDK 25's standard policy; connection establishment remains within the total bound.
   *
   * @param properties positive provider deadlines
   * @return Spring-managed native client, closed at shutdown
   */
  @Bean(destroyMethod = "close")
  HttpClient revenueCatCleanupHttp(AccountCleanupProperties properties) {
    return HttpClient.newBuilder()
        .connectTimeout(properties.connectTimeout())
        .followRedirects(HttpClient.Redirect.NEVER)
        .version(HttpClient.Version.HTTP_1_1)
        .build();
  }

  /**
   * Uses Spring 7.0.9's native total-response timeout, including progressive body consumption.
   *
   * @param properties positive total response deadline
   * @param revenueCatCleanupHttp owned native transport
   * @return ordinary Spring request factory without a custom timeout wrapper
   */
  @Bean
  JdkClientHttpRequestFactory revenueCatCleanupRequests(
      AccountCleanupProperties properties, HttpClient revenueCatCleanupHttp) {
    JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(revenueCatCleanupHttp);
    requests.setReadTimeout(properties.readTimeout());
    return requests;
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
      JdkClientHttpRequestFactory revenueCatCleanupRequests,
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
