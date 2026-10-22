package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ClientOptions;
import com.auth0.client.mgmt.core.Environment;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.config.SecurityProperties;
import jakarta.annotation.PreDestroy;
import jakarta.validation.Validator;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import okhttp3.OkHttpClient;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
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
   * Bounds resource/token requests and disables redirects/retries; Spring closes the owned pool.
   *
   * @param properties feature-owned deadlines
   * @return native request factory with independent acquisition, connect and response bounds
   */
  @Bean(destroyMethod = "destroy")
  HttpComponentsClientHttpRequestFactory auth0Requests(Auth0Properties properties) {
    Timeout connect = Timeout.ofMilliseconds(properties.connectTimeout().toMillis());
    Timeout read = Timeout.ofMilliseconds(properties.readTimeout().toMillis());
    return new HttpComponentsClientHttpRequestFactory(
        HttpClients.custom()
            .disableAutomaticRetries()
            .disableRedirectHandling()
            .setConnectionManager(
                PoolingHttpClientConnectionManagerBuilder.create()
                    .setDefaultConnectionConfig(
                        ConnectionConfig.custom()
                            .setConnectTimeout(connect)
                            .setSocketTimeout(read)
                            .build())
                    .build())
            .setDefaultRequestConfig(
                RequestConfig.custom()
                    .setConnectionRequestTimeout(read)
                    .setResponseTimeout(read)
                    .build())
            .build());
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
   * @param requests bounded provider factory
   * @param properties server-only audience/base URL
   * @param security validated environment issuer
   * @param registrations optional Boot OAuth registrations
   * @param authorizedClients optional Boot in-memory authorized clients
   * @param validator native provider-email validation
   * @param auth0ManagementHttp official SDK resource transport
   * @return exact-principal reader with no mobile secret or caller-derived bearer forwarding
   */
  @Bean
  PrincipalReader auth0PrincipalReader(
      RestClient.Builder builder,
      HttpComponentsClientHttpRequestFactory requests,
      Auth0Properties properties,
      SecurityProperties security,
      ObjectProvider<ClientRegistrationRepository> registrations,
      ObjectProvider<OAuth2AuthorizedClientService> authorizedClients,
      Validator validator,
      OkHttpClient auth0ManagementHttp) {
    ClientRegistrationRepository registration = registrations.getIfAvailable();
    OAuth2AuthorizedClientService clients = authorizedClients.getIfAvailable();
    if (properties.audience() == null
        || registration == null
        || clients == null
        || registration.findByRegistrationId("auth0") == null)
      return (issuer, subject) -> {
        throw new AccountUnavailableException();
      };
    RestClientClientCredentialsTokenResponseClient tokens =
        new RestClientClientCredentialsTokenResponseClient();
    tokens.setParametersCustomizer(
        parameters ->
            parameters.set(OAuth2ParameterNames.AUDIENCE, properties.audience().toString()));
    tokens.setRestClient(
        builder
            .clone()
            .requestFactory(requests)
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
    ManagementApi management =
        new ManagementApi(
            ClientOptions.builder()
                .environment(Environment.custom(properties.audience().toString()))
                .httpClient(auth0ManagementHttp)
                .maxRetries(0)
                .addHeader("Authorization", authorization)
                .build());
    PrincipalReader reader = new Auth0PrincipalClient(management, validator);
    return (issuer, subject) -> {
      if (!security.issuer().toString().equals(issuer)) throw new AccountUnavailableException();
      return reader.read(issuer, subject);
    };
  }
}
