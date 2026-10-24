package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.notifications.api.NotificationRequest;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

/**
 * Real F05 resolution and HTTP security/filter with controlled account storage and F12 decision.
 */
@WebMvcTest(controllers = NotificationAccessTest.Adapter.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  CurrentAccount.class,
  AccountAccess.class,
  NotificationRequest.class,
  NotificationAccessTest.Adapter.class
})
@DisplayName("Notification original owner access")
class NotificationAccessTest {
  private static final UUID A = UUID.fromString("00000000-0000-4000-8000-000000000237");
  private static final UUID B = UUID.fromString("00000000-0000-4000-8000-000000000238");
  private static String issuer;
  private static HttpServer keys;
  private static RSAKey signingKey;
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @MockitoBean private AccountStore store;
  @MockitoBean private MaintenanceAdmission admission;

  /**
   * Starts test-owned JWKS on a dynamic loopback port; no identity provider is contacted.
   *
   * @throws Exception when test keys or the local listener cannot be created
   */
  @BeforeAll
  static void startKeys() throws Exception {
    signingKey = new RSAKeyGenerator(2048).keyID("notifications-test").generate();
    keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    keys.createContext(
        "/.well-known/jwks.json",
        exchange -> {
          byte[] body =
              new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    keys.start();
    issuer = "http://127.0.0.1:" + keys.getAddress().getPort() + "/";
  }

  /** Releases only this suite's isolated key server. */
  @AfterAll
  static void stopKeys() {
    if (keys != null) keys.stop(0);
  }

  /**
   * Selects this suite's synthetic trusted issuer for real bearer validation.
   *
   * @param registry native Spring property overrides
   */
  @DynamicPropertySource
  static void trust(DynamicPropertyRegistry registry) {
    registry.add("blockout.security.issuer", () -> issuer);
  }

  @ParameterizedTest
  @ValueSource(strings = {"mobile-production", "ingestion-test"})
  @DisplayName("Rejects signed wrong-environment and ingestion audiences on notification routes")
  void refusesWrongAudience(String audience) throws Exception {
    // Given
    String token = token(audience, issuer);

    // When
    mvc.perform(get(path(A)).header("Authorization", "Bearer " + token))
        // Then
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(store, admission);
  }

  @Test
  @DisplayName("Rejects another issuer even when signed by the known test key")
  void refusesWrongEnvironmentIssuer() throws Exception {
    // Given
    String token = token("mobile-test", "https://foreign.example.invalid/");

    // When
    mvc.perform(get(path(A)).header("Authorization", "Bearer " + token))
        // Then
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(store, admission);
  }

  @Test
  @DisplayName("Accepts a valid signed mobile bearer for its current original owner")
  void acceptsSignedOwner() throws Exception {
    // Given
    when(store.findByPrincipal(issuer, "auth0|a")).thenReturn(Optional.of(account(A)));

    // When
    mvc.perform(get(path(A)).header("Authorization", "Bearer " + token("mobile-test", issuer)))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(A.toString()));
  }

  /**
   * Signs explicit environment claims for the real Spring decoder, with a bounded valid lifetime.
   *
   * @param audience selected synthetic environment audience
   * @param tokenIssuer trusted or deliberately foreign issuer
   * @return signed bearer for the real security filter
   */
  private static String token(String audience, String tokenIssuer) {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(tokenIssuer)
            .subject("auth0|a")
            .audience(List.of(audience))
            .claim("azp", "mobile-test")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300))
            .build();
    NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)));
    return encoder
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build(),
                claims))
        .getTokenValue();
  }

  @Test
  @DisplayName("Captures the usable original UUID independently of later account resolution")
  void capturesOriginal() throws Exception {
    // Given
    when(store.findByPrincipal(issuer, "auth0|a")).thenReturn(Optional.of(account(A)));

    // When
    MvcResult first =
        mvc.perform(get(path(A)).with(principal("mobile-test")))
            .andExpect(status().isOk())
            .andReturn();
    NotificationContext captured =
        json.readValue(first.getResponse().getContentAsString(), NotificationContext.class);
    when(store.findByPrincipal(issuer, "auth0|a")).thenReturn(Optional.of(account(B)));

    // Then
    assertThat(captured.accountId()).isEqualTo(A);
    mvc.perform(get(path(A)).with(principal("mobile-test"))).andExpect(status().isNotFound());
    mvc.perform(get(path(B)).with(principal("mobile-test")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(B.toString()));
    assertThat(captured.accountId()).isEqualTo(A);
  }

  @Test
  @DisplayName("Refuses erased or not established accounts before personal data")
  void refusesAbsentAccount() throws Exception {
    // Given
    when(store.findByPrincipal(issuer, "auth0|a")).thenReturn(Optional.empty());

    // When
    mvc.perform(get(path(A)).with(principal("mobile-test")))
        // Then
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"pro", "stream-links.moderate", "administrator"})
  @DisplayName("No entitlement or moderation claim grants another inbox")
  void refusesForeignPrivilege(String claim) throws Exception {
    // Given
    when(store.findByPrincipal(issuer, "auth0|a")).thenReturn(Optional.of(account(B)));

    // When
    mvc.perform(
            get(path(A))
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(issuer)
                                    .subject("auth0|a")
                                    .claim("azp", "mobile-test")
                                    .claim(claim, true))))
        // Then
        .andExpect(status().isNotFound());
  }

  @ParameterizedTest
  @ValueSource(strings = {"database", "transaction"})
  @DisplayName("Fails closed when current owner storage is unavailable")
  void refusesUnavailableAccount(String boundary) throws Exception {
    // Given
    when(store.findByPrincipal(issuer, "auth0|a"))
        .thenThrow(
            boundary.equals("database")
                ? new DataAccessResourceFailureException("Synthetic private details")
                : new org.springframework.transaction.CannotCreateTransactionException(
                    "Synthetic private details"));

    // When
    mvc.perform(get(path(A)).with(principal("mobile-test")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  @DisplayName("Keeps maintenance admission independent of usable ownership")
  void requiresAdmission() throws Exception {
    // Given
    doThrow(new MaintenanceRequiredException(new MaintenanceSettings(7L, true, "Pause", null)))
        .when(admission)
        .requireOrdinaryAccess(issuer, "auth0|a", false);

    // When
    mvc.perform(get(path(A)).with(principal("mobile-test")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("An explicitly admitted bypass still resolves only the owner")
  void preservesOwnerWithBypass() throws Exception {
    // Given: shared F12 accepts explicit intent; it does not grant F07 resource ownership.
    when(store.findByPrincipal(issuer, "auth0|a")).thenReturn(Optional.of(account(B)));
    when(admission.requireOrdinaryAccess(issuer, "auth0|a", true)).thenReturn(Optional.of(B));

    // When
    mvc.perform(
            get(path(A))
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("mobile-test")))
        // Then
        .andExpect(status().isNotFound());
    mvc.perform(
            get(path(B))
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("mobile-test")))
        .andExpect(status().isOk());
    verify(admission, org.mockito.Mockito.times(2)).requireOrdinaryAccess(issuer, "auth0|a", true);
  }

  @Test
  @DisplayName("Refuses bypass denied by F12 before owner resolution")
  void refusesDeniedBypass() throws Exception {
    // Given
    doThrow(new AccessDeniedException("Action is not permitted"))
        .when(admission)
        .requireOrdinaryAccess(issuer, "auth0|a", true);

    // When
    mvc.perform(
            get(path(A))
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("mobile-test")))
        // Then
        .andExpect(status().isForbidden());
    verifyNoInteractions(store);
  }

  @ParameterizedTest
  @ValueSource(strings = {"collector-test", "foreign-mobile"})
  @DisplayName("Refuses collector and other-client credentials at native security")
  void refusesWrongClient(String client) throws Exception {
    // Given / When
    mvc.perform(get(path(A)).with(principal(client)))
        // Then
        .andExpect(status().isForbidden());
    verifyNoInteractions(store, admission);
  }

  @Test
  @DisplayName("Challenges guests and invalid bearer credentials")
  void refusesGuest() throws Exception {
    // Given / When
    mvc.perform(get(path(A)))
        .andExpect(status().isUnauthorized())
        .andExpect(header().exists("WWW-Authenticate"));
    mvc.perform(get(path(A)).header("Authorization", "Bearer invalid"))
        .andExpect(status().isUnauthorized());

    // Then
    verifyNoInteractions(store, admission);
  }

  /**
   * Constructs the exact F05 business lifecycle; no provider lookups occur in this slice.
   *
   * @param id scenario's original or recreated account
   * @return synthetic account resolved from the controlled store
   */
  private static Account account(UUID id) {
    return new Account(id, issuer, "auth0|a", "Player", "fixture@example.invalid", null);
  }

  /**
   * Targets the representative private route without inventing a new public resource.
   *
   * @param account requested original owner
   * @return canonical summary route
   */
  private static String path(UUID account) {
    return "/accounts/" + account + "/notification-summary";
  }

  /**
   * Supplies prevalidated JWTs for ownership cases; signed cases above exercise native trust.
   *
   * @param client selected allowed or refused client
   * @return native security test request processor
   */
  private static RequestPostProcessor principal(String client) {
    return jwt().jwt(token -> token.issuer(issuer).subject("auth0|a").claim("azp", client));
  }

  /** Test-only stand-in for the future HTTP endpoint; no notification service is installed. */
  @RestController
  static class Adapter {
    private final NotificationRequest requests;

    /**
     * Injects the production owner resolver.
     *
     * @param requests F07 binding after shared HTTP admission
     */
    Adapter(NotificationRequest requests) {
      this.requests = requests;
    }

    /**
     * Captures admitted immutable context without reading an inbox.
     *
     * @param accountId original UUID from the requested resource
     * @return captured owner for HTTP assertions, not the future production summary representation
     */
    @GetMapping("/accounts/{accountId}/notification-summary")
    ResponseEntity<NotificationContext> summary(@PathVariable UUID accountId) {
      return ResponseEntity.ok(requests.owner(accountId));
    }
  }
}
