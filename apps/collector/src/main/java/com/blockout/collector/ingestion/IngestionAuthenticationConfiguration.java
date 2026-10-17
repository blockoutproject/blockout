package com.blockout.collector.ingestion;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.AuthorizedClientServiceOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.ClientCredentialsOAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.endpoint.RestClientClientCredentialsTokenResponseClient;
import org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.client.OAuth2ClientHttpRequestInterceptor;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter;
import org.springframework.web.client.RestClient;

/** Uses Boot's registration/in-memory service and Spring's non-web client-credentials lifecycle. */
@Configuration(proxyBeanMethods = false)
public class IngestionAuthenticationConfiguration {
  /**
   * Adds Auth0's audience parameter to standard token requests over the bounded no-retry transport.
   *
   * @param factory shared connect, lease and response limits, with retries and redirects disabled
   * @param audience intended environment-specific ingestion API
   * @return native provider with its standard expiry/skew behavior
   */
  @Bean
  ClientCredentialsOAuth2AuthorizedClientProvider ingestionCredentialsProvider(
      HttpComponentsClientHttpRequestFactory factory,
      @Value("${blockout.ingestion.audience}") String audience) {
    RestClientClientCredentialsTokenResponseClient tokens =
        new RestClientClientCredentialsTokenResponseClient();
    tokens.setParametersCustomizer(
        parameters -> parameters.set(OAuth2ParameterNames.AUDIENCE, audience));
    tokens.setRestClient(
        RestClient.builder()
            .requestFactory(factory)
            .configureMessageConverters(
                converters ->
                    converters.addCustomConverter(
                        new OAuth2AccessTokenResponseHttpMessageConverter()))
            .defaultStatusHandler(new OAuth2ErrorResponseErrorHandler())
            .build());
    ClientCredentialsOAuth2AuthorizedClientProvider provider =
        new ClientCredentialsOAuth2AuthorizedClientProvider();
    provider.setAccessTokenResponseClient(tokens);
    return provider;
  }

  /**
   * Reuses native authorized clients until renewal is needed; no servlet session or token store.
   *
   * @param registrations Boot's environment-bound registration repository
   * @param clients Boot's in-memory authorized-client service
   * @param provider bounded standard client-credentials grant
   * @return manager for the collector's application principal
   */
  @Bean
  OAuth2AuthorizedClientManager ingestionAuthorizedClientManager(
      ClientRegistrationRepository registrations,
      OAuth2AuthorizedClientService clients,
      ClientCredentialsOAuth2AuthorizedClientProvider provider) {
    AuthorizedClientServiceOAuth2AuthorizedClientManager manager =
        new AuthorizedClientServiceOAuth2AuthorizedClientManager(registrations, clients);
    manager.setAuthorizedClientProvider(provider);
    return manager;
  }

  /**
   * Supplies bearer credentials without replaying a rejected or uncertain business request.
   *
   * @param manager native acquisition and renewal owner
   * @param clients native in-memory service for standard invalid-token eviction
   * @return Spring interceptor scoped to the one ingestion registration and application principal
   */
  @Bean
  OAuth2ClientHttpRequestInterceptor ingestionAuthentication(
      OAuth2AuthorizedClientManager manager, OAuth2AuthorizedClientService clients) {
    OAuth2ClientHttpRequestInterceptor authentication =
        new OAuth2ClientHttpRequestInterceptor(manager);
    Authentication principal =
        UsernamePasswordAuthenticationToken.authenticated("collector", "N/A", List.of());
    authentication.setClientRegistrationIdResolver(request -> "ingestion");
    authentication.setPrincipalResolver(request -> principal);
    authentication.setAuthorizationFailureHandler(
        OAuth2ClientHttpRequestInterceptor.authorizationFailureHandler(clients));
    return authentication;
  }
}
