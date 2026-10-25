package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.config.SecurityProperties;
import com.sun.net.httpserver.HttpServer;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.web.client.RestClient;

/**
 * Real isolated HTTP/token transport; provider configuration, credentials and SQL stay synthetic.
 */
@DisplayName("Bounded server-only Auth0 authentication")
class Auth0ConfigurationIntegrationTest {
  private final ValidatorFactory validators = Validation.buildDefaultValidatorFactory();
  private final Auth0Configuration configuration = new Auth0Configuration();
  private final CountDownLatch release = new CountDownLatch(1);
  private final AtomicInteger tokens = new AtomicInteger();
  private final AtomicInteger reads = new AtomicInteger();
  private final ExecutorService workers = Executors.newCachedThreadPool();
  private HttpServer server;
  private String origin;
  private HttpComponentsClientHttpRequestFactory requests;
  private String tokenRequest;
  private String resourceAuthorization;
  private boolean refuseToken;
  private String delayedPath;

  /**
   * Starts a suite-owned ephemeral loopback listener; no existing application service is used.
   *
   * @throws Exception if the isolated listener cannot start
   */
  @BeforeEach
  void start() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.setExecutor(workers);
    server.createContext(
        "/",
        exchange -> {
          String path = exchange.getRequestURI().getPath();
          boolean token = path.equals("/oauth/token");
          if (token) {
            tokens.incrementAndGet();
            tokenRequest =
                new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
          } else {
            reads.incrementAndGet();
            resourceAuthorization = exchange.getRequestHeaders().getFirst("Authorization");
          }
          if (path.equals(delayedPath)) {
            try {
              release.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException interrupted) {
              Thread.currentThread().interrupt();
            }
          }
          String body =
              token
                  ? refuseToken
                      ? "{\"error\":\"access_denied\",\"error_description\":\"private provider diagnostics\"}"
                      : "{\"access_token\":\"synthetic-provider-token\",\"token_type\":\"Bearer\",\"expires_in\":3600}"
                  : "{\"user_id\":\"auth0|one\",\"email\":\"player@example.invalid\"}";
          byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(token && refuseToken ? 403 : 200, bytes.length);
          try (java.io.OutputStream response = exchange.getResponseBody()) {
            response.write(bytes);
          }
        });
    server.start();
    origin = "http://127.0.0.1:" + server.getAddress().getPort();
  }

  /** Releases only this suite's listener, HTTP pool, validator and controlled worker threads. */
  @AfterEach
  void close() throws Exception {
    release.countDown();
    server.stop(0);
    workers.shutdownNow();
    if (requests != null) requests.destroy();
    validators.close();
    configuration.closeManagementHttp();
  }

  @Test
  @DisplayName("Obtains server credentials with the exact audience and reuses native token expiry")
  void usesNativeClientCredentials() {
    // Given
    PrincipalReader reader = reader();

    // When
    PrincipalReader.Evidence first = reader.read(origin + "/", "auth0|one");
    reader.read(origin + "/", "auth0|one");

    // Then
    assertThat(first.email()).isEqualTo("player@example.invalid");
    assertThat(tokenRequest)
        .contains(
            "grant_type=client_credentials",
            "client_id=server-test",
            "client_secret=synthetic-secret",
            "scope=read%3Ausers",
            "audience=http%3A%2F%2F127.0.0.1%3A");
    assertThat(resourceAuthorization).isEqualTo("Bearer synthetic-provider-token");
    assertThat(tokens.get()).isEqualTo(1);
    assertThat(reads.get()).isEqualTo(2);
  }

  @ParameterizedTest
  @ValueSource(strings = {"/oauth/token", "/api/v2/users/auth0|one"})
  @DisplayName("Bounds token and resource waiting without retrying either request")
  void boundsBothRequests(String path) {
    // Given
    delayedPath = path;
    PrincipalReader reader = reader();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> reader.read(origin + "/", "auth0|one");

    // Then
    assertThatThrownBy(read).isInstanceOf(AccountUnavailableException.class);
    assertThat(tokens.get()).isEqualTo(1);
    assertThat(reads.get()).isEqualTo(path.equals("/oauth/token") ? 0 : 1);
  }

  @Test
  @DisplayName("Refuses a different validated issuer before provider or token access")
  void refusesDifferentIssuer() {
    // Given
    PrincipalReader reader = reader();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> reader.read("https://other.example.invalid/", "auth0|one");

    // Then
    assertThatThrownBy(read).isInstanceOf(AccountUnavailableException.class);
    assertThat(tokens.get()).isZero();
    assertThat(reads.get()).isZero();
  }

  @Test
  @DisplayName("Translates token refusal without leaking provider diagnostics or reading the user")
  void refusesTokenSafely() {
    // Given
    refuseToken = true;
    PrincipalReader reader = reader();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> reader.read(origin + "/", "auth0|one");

    // Then
    assertThatThrownBy(read)
        .isInstanceOf(AccountUnavailableException.class)
        .hasMessageNotContaining("private provider diagnostics");
    assertThat(reads.get()).isZero();
  }

  /**
   * Constructs the production native client with a controlled registration and short test
   * deadlines.
   *
   * @return real account reader over the suite's listener
   */
  private PrincipalReader reader() {
    ClientRegistration registration =
        ClientRegistration.withRegistrationId("auth0")
            .clientId("server-test")
            .clientSecret("synthetic-secret")
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
            .tokenUri(origin + "/oauth/token")
            .scope("read:users")
            .build();
    ClientRegistrationRepository registrations =
        new InMemoryClientRegistrationRepository(registration);
    OAuth2AuthorizedClientService clients =
        new InMemoryOAuth2AuthorizedClientService(registrations);
    StaticListableBeanFactory beans = new StaticListableBeanFactory();
    beans.addBean("registrations", registrations);
    beans.addBean("clients", clients);
    Auth0Properties properties =
        new Auth0Properties(
            URI.create(origin + "/api/v2/"), Duration.ofSeconds(1), Duration.ofMillis(200));
    requests = configuration.auth0Requests(properties);
    SecurityProperties security =
        new SecurityProperties(
            URI.create(origin + "/"), "mobile", "mobile", "collector", "collector");
    return configuration.auth0PrincipalReader(
        RestClient.builder(),
        requests,
        properties,
        security,
        beans.getBeanProvider(ClientRegistrationRepository.class),
        beans.getBeanProvider(OAuth2AuthorizedClientService.class),
        validators.getValidator(),
        configuration.auth0ManagementHttp(properties));
  }
}
