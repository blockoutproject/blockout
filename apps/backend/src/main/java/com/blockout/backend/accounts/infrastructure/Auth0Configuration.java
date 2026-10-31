package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ClientOptions;
import com.auth0.client.mgmt.core.Environment;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.config.SecurityProperties;
import jakarta.annotation.PreDestroy;
import jakarta.validation.Validator;
import java.net.http.HttpClient;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import okhttp3.OkHttpClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.oauth2.client.AuthorizedClientServiceOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.ClientCredentialsOAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.endpoint.RestClientClientCredentialsTokenResponseClient;
import org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter;
import org.springframework.web.client.RestClient;

/** Native server-only OAuth client credentials; construction performs no provider request. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(Auth0Properties.class)
public class Auth0Configuration {
  private OkHttpClient managementHttp;

  /**
   * Owns a native HTTP/1.1 client with redirects disabled. Transmitted POST/DELETE requests are not
   * replayed by JDK 25's standard policy; connection establishment remains within the total bound.
   *
   * @param properties positive provider deadlines
   * @return Spring-managed native client, closed at shutdown
   */
  @Bean(destroyMethod = "close")
  HttpClient auth0TokenHttp(Auth0Properties properties) {
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
   * @param auth0TokenHttp owned native transport
   * @return ordinary Spring request factory without a custom timeout wrapper
   */
  @Bean
  JdkClientHttpRequestFactory auth0Requests(Auth0Properties properties, HttpClient auth0TokenHttp) {
    JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(auth0TokenHttp);
    requests.setReadTimeout(properties.readTimeout());
    return requests;
  }

  /**
   * Supplies the official SDK's resource transport with explicit deadlines and no redirect/retry.
   *
   * @param properties account provider deadlines
   * @return owned native OkHttp client, whose pool is released at shutdown
   */
  @Bean(destroyMethod = "")
  OkHttpClient auth0ManagementHttp(Auth0Properties properties) {
    managementHttp =
        new OkHttpClient.Builder()
            .connectTimeout(properties.connectTimeout().toMillis(), TimeUnit.MILLISECONDS)
            .readTimeout(properties.readTimeout().toMillis(), TimeUnit.MILLISECONDS)
            .callTimeout(properties.readTimeout().toMillis(), TimeUnit.MILLISECONDS)
            .retryOnConnectionFailure(false)
            .followRedirects(false)
            .followSslRedirects(false)
            .build();
    return managementHttp;
  }

  /**
   * Releases the SDK's owned native pool and dispatcher; no other application's clients are closed.
   */
  @PreDestroy
  void closeManagementHttp() {
    if (managementHttp != null) {
      managementHttp.connectionPool().evictAll();
      managementHttp.dispatcher().executorService().shutdown();
    }
  }

  /**
   * Uses the native non-web manager and standard token expiry cache for the configured M2M client.
   * Missing configuration refuses reads without blocking guest/application startup.
   *
   * @param builder Boot's application HTTP builder
   * @param auth0Requests bounded provider factory
   * @param properties server-only audience/base URL
   * @param registrations optional Boot OAuth registrations
   * @param authorizedClients optional Boot in-memory authorized clients
   * @param auth0ManagementHttp official SDK resource transport
   * @return shared official server SDK, absent without environment configuration
   */
  @Bean
  @org.jspecify.annotations.Nullable
  ManagementApi auth0ManagementApi(
      RestClient.Builder builder,
      JdkClientHttpRequestFactory auth0Requests,
      Auth0Properties properties,
      ObjectProvider<ClientRegistrationRepository> registrations,
      ObjectProvider<OAuth2AuthorizedClientService> authorizedClients,
      OkHttpClient auth0ManagementHttp) {
    ClientRegistrationRepository registration = registrations.getIfAvailable();
    OAuth2AuthorizedClientService clients = authorizedClients.getIfAvailable();
    if (properties.audience() == null
        || registration == null
        || clients == null
        || registration.findByRegistrationId("auth0") == null) return null;
    RestClientClientCredentialsTokenResponseClient tokens =
        new RestClientClientCredentialsTokenResponseClient();
    tokens.setParametersCustomizer(
        parameters ->
            parameters.set(OAuth2ParameterNames.AUDIENCE, properties.audience().toString()));
    tokens.setRestClient(
        builder
            .clone()
            .requestFactory(auth0Requests)
            .configureMessageConverters(
                converters ->
                    converters.addCustomConverter(
                        new OAuth2AccessTokenResponseHttpMessageConverter()))
            .defaultStatusHandler(new OAuth2ErrorResponseErrorHandler())
            .build());
    ClientCredentialsOAuth2AuthorizedClientProvider provider =
        new ClientCredentialsOAuth2AuthorizedClientProvider();
    provider.setAccessTokenResponseClient(tokens);
    AuthorizedClientServiceOAuth2AuthorizedClientManager manager =
        new AuthorizedClientServiceOAuth2AuthorizedClientManager(registration, clients);
    manager.setAuthorizedClientProvider(provider);
    Supplier<String> authorization =
        () -> {
          OAuth2AuthorizedClient authorized =
              manager.authorize(
                  OAuth2AuthorizeRequest.withClientRegistrationId("auth0")
                      .principal("account-provider")
                      .build());
          if (authorized == null) throw new AccountUnavailableException();
          return "Bearer " + authorized.getAccessToken().getTokenValue();
        };
    return new ManagementApi(
        ClientOptions.builder()
            .environment(Environment.custom(properties.audience().toString()))
            .httpClient(auth0ManagementHttp)
            .maxRetries(0)
            .addHeader("Authorization", authorization)
            .build());
  }

  /**
   * Adapts the shared official client to necessary establishment evidence only.
   *
   * @param management optional configured server SDK
   * @param validator native provider-email validator
   * @param security accepted environment issuer
   * @return exact-principal reader; missing configuration fails closed
   */
  @Bean
  PrincipalReader auth0PrincipalReader(
      java.util.Optional<ManagementApi> management,
      Validator validator,
      SecurityProperties security) {
    PrincipalReader reader =
        management
            .<PrincipalReader>map(client -> new Auth0PrincipalClient(client, validator))
            .orElse(
                (issuer, subject) -> {
                  throw new AccountUnavailableException();
                });
    return (issuer, subject) -> {
      if (!security.issuer().toString().equals(issuer)) throw new AccountUnavailableException();
      return reader.read(issuer, subject);
    };
  }
}
