package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.application.PermissionStore;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.contributions.api.ContributionRequest;
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
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real JWT, F05 identity, F12 admission/grant and F08 context composition. Account/settings stores
 * and transactions are controlled: these tests establish no SQL lock, erasure or business action.
 */
@WebMvcTest(controllers = ContributionAccessTest.AccessAdapter.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  CurrentAccount.class,
  CurrentPermissions.class,
  ActionAuthorization.class,
  MaintenanceAdmission.class,
  ContributionRequest.class,
  ContributionAccessTest.AccessAdapter.class
})
@DisplayName("Contribution current actor access")
class ContributionAccessTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000223");
  private static final UUID RECREATED = UUID.fromString("00000000-0000-4000-8000-000000000224");
  private static HttpServer keys;
  private static RSAKey trusted;
  private static String issuer;
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PlatformTransactionManager transactions;

  /** Starts a task-owned ephemeral JWKS server without provider credentials. */
  @BeforeAll
  static void startKeys() throws Exception {
    trusted = new RSAKeyGenerator(2048).keyID("contribution-test").generate();
    keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    keys.createContext(
        "/.well-known/jwks.json",
        exchange -> {
          byte[] body =
              new JWKSet(trusted.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    keys.start();
    issuer = "http://127.0.0.1:" + keys.getAddress().getPort();
  }

  /** Releases only this suite's ephemeral listener. */
  @AfterAll
  static void stopKeys() {
    keys.stop(0);
  }

  /**
   * Supplies isolated public trust inputs to real security configuration.
   *
   * @param registry native test property registry
   */
  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("blockout.security.issuer", () -> issuer);
    registry.add("blockout.security.mobile-audience", () -> "mobile-test");
    registry.add("blockout.security.mobile-client-id", () -> "mobile-client");
    registry.add("blockout.security.ingestion-audience", () -> "collector-test");
    registry.add("blockout.security.ingestion-client-id", () -> "collector-client");
  }

  /** Defaults to an existing ordinary account under inactive maintenance. */
  @BeforeEach
  void prepare() {
    when(accounts.currentId(issuer, "original-subject")).thenReturn(Optional.of(ACCOUNT));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT)).thenReturn(Set.of());
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(0, false, "Available", null));
    when(transactions.getTransaction(any()))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Returns the original usable UUID without a subscription condition")
  void resolvesOriginalAccount(boolean pro) throws Exception {
    // Given
    String token = token(issuer, "mobile-test", "mobile-client", pro);

    // When
    ResultActions response = mvc.perform(owner(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isOk());
  }

  @Test
  @DisplayName("Refuses another original account instead of transferring ownership")
  void refusesAnotherAccount() throws Exception {
    // Given
    String token = token(issuer, "mobile-test", "mobile-client", false);

    // When
    ResultActions response =
        mvc.perform(owner(RECREATED).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Refuses an erased account even while its bearer remains valid")
  void refusesErasedAccount() throws Exception {
    // Given
    when(accounts.currentId(issuer, "original-subject")).thenReturn(Optional.empty());

    // When
    ResultActions response =
        mvc.perform(
            owner(ACCOUNT)
                .header(
                    "Authorization",
                    "Bearer " + token(issuer, "mobile-test", "mobile-client", false)));

    // Then
    response.andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Does not redirect an old command to the recreated account of the same principal")
  void refusesRecreatedAccount() throws Exception {
    // Given
    when(accounts.currentId(issuer, "original-subject")).thenReturn(Optional.of(RECREATED));
    String bearer = token(issuer, "mobile-test", "mobile-client", false);

    // When
    ResultActions old = mvc.perform(owner(ACCOUNT).header("Authorization", "Bearer " + bearer));

    // Then
    old.andExpect(status().isForbidden());
    mvc.perform(owner(RECREATED).header("Authorization", "Bearer " + bearer))
        .andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "guest",
        "malformed",
        "wrong-issuer",
        "wrong-audience",
        "collector",
        "wrong-client"
      })
  @DisplayName("Refuses untrusted credentials before account or grant effects")
  void refusesCredentials(String kind) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = owner(ACCOUNT);
    if (!kind.equals("guest"))
      request.header(
          "Authorization",
          "Bearer "
              + (kind.equals("malformed")
                  ? "malformed"
                  : token(
                      kind.equals("wrong-issuer") ? "https://other.example.invalid/" : issuer,
                      kind.equals("wrong-audience")
                          ? "production"
                          : kind.equals("collector") ? "collector-test" : "mobile-test",
                      kind.equals("collector")
                          ? "collector-client"
                          : kind.equals("wrong-client") ? "other-client" : "mobile-client",
                      false)));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    if (kind.equals("wrong-client")) response.andExpect(status().isForbidden());
    else response.andExpect(status().isUnauthorized());
    verifyNoInteractions(accounts, permissions, settings);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "read",
        "history",
        "publish",
        "replace",
        "withdraw",
        "approve",
        "reject",
        "reactivate"
      })
  @DisplayName("One stream-only grant permits every video moderation context")
  void admitsCompleteModeration(String action) throws Exception {
    // Given
    when(permissions.findByAccountId(ACCOUNT)).thenReturn(Set.of(Permission.MODERATE_STREAM_LINKS));

    // When
    ResultActions response =
        mvc.perform(
            moderator(action)
                .header(
                    "Authorization",
                    "Bearer " + token(issuer, "mobile-test", "mobile-client", false)));

    // Then
    response.andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Current absence or unrelated administration and Pro confer no moderation")
  void refusesUnrelatedPower(boolean unrelatedGrants) throws Exception {
    // Given
    when(permissions.findByAccountId(ACCOUNT))
        .thenReturn(
            unrelatedGrants
                ? Set.of(Permission.MANAGE_MAINTENANCE, Permission.MANAGE_COLLECTION)
                : Set.of());

    // When
    ResultActions response =
        mvc.perform(
            moderator("publish")
                .header(
                    "Authorization",
                    "Bearer " + token(issuer, "mobile-test", "mobile-client", true)));

    // Then
    response.andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Re-reads the moderation grant after it is revoked")
  void refusesRevokedGrant() throws Exception {
    // Given
    when(permissions.findByAccountId(ACCOUNT))
        .thenReturn(Set.of(Permission.MODERATE_STREAM_LINKS), Set.of());
    String bearer = token(issuer, "mobile-test", "mobile-client", false);

    // When
    ResultActions first =
        mvc.perform(moderator("read").header("Authorization", "Bearer " + bearer));

    // Then
    first.andExpect(status().isOk());
    mvc.perform(moderator("approve").header("Authorization", "Bearer " + bearer))
        .andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(strings = {"none", "stream-only", "bypass-only", "both"})
  @DisplayName("Keeps explicit maintenance bypass separate from stream moderation")
  void separatesMaintenance(String grants) throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, true, "Maintenance", null));
    when(permissions.findByAccountId(ACCOUNT))
        .thenReturn(
            switch (grants) {
              case "stream-only" -> Set.of(Permission.MODERATE_STREAM_LINKS);
              case "bypass-only" -> Set.of(Permission.BYPASS_MAINTENANCE);
              case "both" ->
                  Set.of(Permission.MODERATE_STREAM_LINKS, Permission.BYPASS_MAINTENANCE);
              default -> Set.of();
            });
    String bearer = token(issuer, "mobile-test", "mobile-client", false);

    // When
    ResultActions ordinary =
        mvc.perform(moderator("publish").header("Authorization", "Bearer " + bearer));
    ResultActions bypass =
        mvc.perform(
            moderator("publish")
                .header("Authorization", "Bearer " + bearer)
                .header("Blockout-Maintenance-Bypass", "true"));

    // Then
    ordinary.andExpect(status().isServiceUnavailable());
    if (grants.equals("both")) bypass.andExpect(status().isOk());
    else bypass.andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Stream-only context supplies no unrelated or bypass grant")
  void exposesOnlyStreamCapability() {
    // Given
    ContributionContext context = new ContributionContext(ACCOUNT, true);

    // When
    context.requireModeration();

    // Then
    assertThat(context.accountId()).isEqualTo(ACCOUNT);
    assertThat(context.moderateStreamLinks()).isTrue();
  }

  /**
   * Selects the original-account probe without a business mutation.
   *
   * @param account original path identity under test
   * @return personal request builder
   */
  private static MockHttpServletRequestBuilder owner(UUID account) {
    return get("/accounts/" + account + "/matches/" + ACCOUNT + "/stream-contributions");
  }

  /**
   * Selects a private moderation probe using the same capability for every action.
   *
   * @param action scenario label; no action is executed
   * @return moderation request builder for the original actor
   */
  private static MockHttpServletRequestBuilder moderator(String action) {
    return get("/administration/stream-moderation")
        .param("actor", ACCOUNT.toString())
        .param("action", action);
  }

  /**
   * Signs a synthetic principal for the native resource-server decoder.
   *
   * @param tokenIssuer exact scenario issuer
   * @param audience scenario environment audience
   * @param client authorized or refused caller identity
   * @param pro unrelated entitlement claim, which must not confer a capability
   * @return signed bearer for this suite's isolated key
   */
  private static String token(String tokenIssuer, String audience, String client, boolean pro) {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(tokenIssuer)
            .subject("original-subject")
            .audience(List.of(audience))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(600))
            .claim("azp", client)
            .claim("entitlement", pro ? "pro" : "free")
            .build();
    return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(trusted)))
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(trusted.getKeyID()).build(), claims))
        .getTokenValue();
  }

  /** Test-only access composition; no submission, quota, storage or moderation endpoint exists. */
  @RestController
  static class AccessAdapter {
    private final ContributionRequest requests;

    /**
     * Supplies the real current-account/grant boundary to isolated probes.
     *
     * @param requests current F05/F12 binding under test
     */
    AccessAdapter(ContributionRequest requests) {
      this.requests = requests;
    }

    /**
     * Checks original personal scope without establishing an account.
     *
     * @param accountId original path identity
     * @param matchId path context; no sporting read is performed
     * @return currently usable original identity
     */
    @GetMapping("/accounts/{accountId}/matches/{matchId}/stream-contributions")
    UUID own(@PathVariable UUID accountId, @PathVariable UUID matchId) {
      ContributionContext context = requests.current();
      context.requireOriginalAccount(accountId);
      return context.accountId();
    }

    /**
     * Checks the original moderator for any video action without performing effects.
     *
     * @param actor original command actor
     * @param action scenario label; confers no privilege
     * @return admitted original moderator identity
     */
    @GetMapping("/administration/stream-moderation")
    UUID moderation(@RequestParam UUID actor, @RequestParam String action) {
      ContributionContext context = requests.current();
      context.requireOriginalAccount(actor);
      context.requireModeration();
      return context.accountId();
    }
  }
}
