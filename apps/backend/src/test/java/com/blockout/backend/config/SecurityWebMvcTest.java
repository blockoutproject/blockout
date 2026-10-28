package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.backend.generated.ingestion.model.CollectorRuntimeInternalResponse;
import com.blockout.backend.generated.mobile.api.AccountsApi;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.generated.mobile.model.ChangeAccountProfileRequest;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Exercises real JWT verification against isolated keys; controller effects are test-owned. */
@WebMvcTest(controllers = SecurityWebMvcTest.BoundaryAdapter.class)
@Import({SecurityConfiguration.class, SecurityWebMvcTest.BoundaryAdapter.class})
@DisplayName("Environment-specific bearer authentication")
@org.springframework.test.context.bean.override.mockito.MockitoBean(
    types = com.blockout.backend.access.application.MaintenanceAdmission.class)
class SecurityWebMvcTest {
  private static final String ACCOUNT = "/accounts/00000000-0000-4000-8000-000000000001";
  private static HttpServer keys;
  private static RSAKey trusted;
  private static RSAKey foreign;
  private static String issuer;
  @Autowired private MockMvc mvc;
  @Autowired private BoundaryAdapter boundary;

  /**
   * Starts a loopback JWKS endpoint containing only the trusted public key.
   *
   * @throws Exception if an isolated key or listener cannot be created
   */
  @BeforeAll
  static void startKeys() throws Exception {
    trusted = new RSAKeyGenerator(2048).keyID("trusted").generate();
    foreign = new RSAKeyGenerator(2048).keyID("trusted").generate();
    keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    keys.createContext(
        "/.well-known/jwks.json",
        exchange -> {
          byte[] json =
              new JWKSet(trusted.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, json.length);
          exchange.getResponseBody().write(json);
          exchange.close();
        });
    keys.start();
    issuer = "http://127.0.0.1:" + keys.getAddress().getPort() + "/";
  }

  /** Releases the isolated key endpoint after the suite. */
  @AfterAll
  static void stopKeys() {
    keys.stop(0);
  }

  /**
   * Supplies public test identities without contacting Auth0 or using environment secrets.
   *
   * @param registry native test property overrides
   */
  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("blockout.security.issuer", () -> issuer);
    registry.add("blockout.security.mobile-audience", () -> "mobile-preproduction");
    registry.add("blockout.security.mobile-client-id", () -> "mobile-client");
    registry.add("blockout.security.ingestion-audience", () -> "ingestion-preproduction");
    registry.add("blockout.security.ingestion-client-id", () -> "collector-client");
  }

  /** Clears test-owned effects independently of authentication or admission configuration. */
  @BeforeEach
  void resetEffects() {
    boundary.reset();
  }

  @Test
  @DisplayName("Challenges a visitor without invoking an account effect")
  void refusesVisitor() throws Exception {
    // Given
    // No bearer credentials are supplied.

    // When
    ResultActions response = mvc.perform(delete(ACCOUNT));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("WWW-Authenticate", startsWith("Bearer")))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unauthenticated"));
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @Test
  @DisplayName("Rejects a signature from an untrusted private key")
  void refusesForeignSignature() throws Exception {
    // Given
    String token = signed(claims("mobile-preproduction", "mobile-client").build(), foreign);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("WWW-Authenticate", startsWith("Bearer")));
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @Test
  @DisplayName("Rejects an expired bearer before an account effect")
  void refusesExpiredToken() throws Exception {
    // Given
    String token =
        signed(
            claims("mobile-preproduction", "mobile-client")
                .issuedAt(Instant.now().minusSeconds(7200))
                .expiresAt(Instant.now().minusSeconds(3600))
                .build(),
            trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isUnauthorized());
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @Test
  @DisplayName("Rejects an actually expired bearer before support maintenance bypass")
  void refusesExpiredSupportBypass() throws Exception {
    // Given
    String token = signed(claims("mobile-preproduction", "mobile-client")
        .issuedAt(Instant.now().minusSeconds(7200))
        .expiresAt(Instant.now().minusSeconds(3600)).build(), trusted);

    // When
    ResultActions response = mvc.perform(post("/support-requests")
        .header("Authorization", "Bearer " + token)
        .header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response.andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Rejects a correctly signed token from another issuer")
  void refusesWrongIssuer() throws Exception {
    // Given
    String token =
        signed(
            claims("mobile-preproduction", "mobile-client")
                .issuer("https://foreign.example.invalid/")
                .build(),
            trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isUnauthorized());
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @ParameterizedTest
  @ValueSource(strings = {"mobile-production", "ingestion-preproduction"})
  @DisplayName("Rejects another environment or ingestion audience on the mobile boundary")
  void refusesWrongAudience(String audience) throws Exception {
    // Given
    String token = signed(claims(audience, "mobile-client").build(), trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isUnauthorized());
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @ParameterizedTest
  @ValueSource(strings = {"foreign-client", "collector-client"})
  @DisplayName("Forbids an authenticated but unapproved mobile client")
  void refusesWrongClient(String client) throws Exception {
    // Given
    String token = signed(claims("mobile-preproduction", client).build(), trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isForbidden());
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @Test
  @DisplayName("Passes a valid mobile bearer to the generated account boundary")
  void acceptsMobileToken() throws Exception {
    // Given
    String token = signed(claims("mobile-preproduction", "mobile-client").build(), trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isNoContent()).andExpect(header().doesNotExist("Set-Cookie"));
    assertThat(boundary.erasedAccounts()).isEqualTo(1);
  }

  @Test
  @DisplayName("Rejects a bearer without verifiable expiry")
  void refusesMissingExpiry() throws Exception {
    // Given
    String token =
        signed(
            claims("mobile-preproduction", "mobile-client")
                .claims(values -> values.remove("exp"))
                .build(),
            trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isUnauthorized());
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @Test
  @DisplayName("Rejects a bearer that is not valid yet")
  void refusesFutureToken() throws Exception {
    // Given
    String token =
        signed(
            claims("mobile-preproduction", "mobile-client")
                .notBefore(Instant.now().plusSeconds(300))
                .build(),
            trusted);

    // When
    ResultActions response =
        mvc.perform(delete(ACCOUNT).header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isUnauthorized());
    assertThat(boundary.erasedAccounts()).isZero();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/application-access",
        "/api/v1/mobile/public/config/app-status",
        "/clubs",
        "/teams/00000000-0000-4000-8000-000000000001/follower-count",
        "/matches"
      })
  @DisplayName("Passes anonymous public API reads to their owning controllers")
  void permitsPublicApiRead(String path) throws Exception {
    // Given
    // These future business controllers are deliberately absent from this security-only slice.

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response.andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Requires the dedicated ingestion scope")
  void refusesMissingIngestionScope() throws Exception {
    // Given
    String token = signed(claims("ingestion-preproduction", "collector-client").build(), trusted);

    // When
    ResultActions response =
        mvc.perform(
            get(CollectorOperationsApi.PATH_GET_COLLECTOR_RUNTIME)
                .header("Authorization", "Bearer " + token));

    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("WWW-Authenticate", startsWith("Bearer")))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:forbidden"));
  }

  @Test
  @DisplayName("Forbids another client even with the ingestion scope")
  void refusesForeignCollectorClient() throws Exception {
    // Given
    String token =
        signed(
            claims("ingestion-preproduction", "mobile-client")
                .claim("scope", "sporting:ingest")
                .build(),
            trusted);

    // When
    ResultActions response =
        mvc.perform(
            get(CollectorOperationsApi.PATH_GET_COLLECTOR_RUNTIME)
                .header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Accepts the dedicated collector audience, client and scope")
  void acceptsCollectorToken() throws Exception {
    // Given
    String token =
        signed(
            claims("ingestion-preproduction", "collector-client")
                .claim("scope", "sporting:ingest")
                .build(),
            trusted);

    // When
    ResultActions response =
        mvc.perform(
            get(CollectorOperationsApi.PATH_GET_COLLECTOR_RUNTIME)
                .header("Authorization", "Bearer " + token));

    // Then
    response.andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/legals/privacy", "/legals/imprint", "/legals/terms"})
  @DisplayName("Keeps existing legal document reads public")
  void permitsLegalRead(String path) throws Exception {
    // Given
    // The test owns only document delivery, without a provider session.

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response.andExpect(status().isOk());
  }

  @Test
  @DisplayName("Keeps a business access denial on the native Bearer 403 boundary")
  void translatesBusinessDenial() throws Exception {
    // Given
    String token = signed(claims("mobile-preproduction", "mobile-client").build(), trusted);

    // When
    ResultActions response =
        mvc.perform(get("/test/business-denial").header("Authorization", "Bearer " + token));

    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("WWW-Authenticate", startsWith("Bearer")))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:forbidden"))
        .andExpect(jsonPath("$.status").value(403))
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  /**
   * Builds valid secondary claims; each scenario explicitly supplies audience and client.
   *
   * @param audience intended API recipient
   * @param client Auth0 calling application
   * @return mutable claims for explicit scenario overrides
   */
  private JwtClaimsSet.Builder claims(String audience, String client) {
    return JwtClaimsSet.builder()
        .issuer(issuer)
        .subject("auth0|harmless-user")
        .audience(List.of(audience))
        .issuedAt(Instant.now())
        .expiresAt(Instant.now().plusSeconds(3600))
        .claim("azp", client);
  }

  /**
   * Signs synthetic claims with a test-owned key; no provider credential is used.
   *
   * @param claims explicit valid or invalid scenario values
   * @param key isolated signing key
   * @return bearer value for the real decoder
   */
  private String signed(JwtClaimsSet claims, RSAKey key) {
    return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)))
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(key.getKeyID()).build(), claims))
        .getTokenValue();
  }

  /** Supplies generated account mappings and a controlled ingestion read, without domain logic. */
  @TestComponent
  @RestController
  static class BoundaryAdapter implements AccountsApi {
    private final AtomicInteger erased = new AtomicInteger();

    /** Clears effects between independent HTTP scenarios through the validated controller proxy. */
    void reset() {
      erased.set(0);
    }

    int erasedAccounts() {
      return erased.get();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> eraseAccount(UUID accountId, Boolean bypass) {
      erased.incrementAndGet();
      return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> establishAccount(Boolean bypass) {
      return ResponseEntity.notFound().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> getMyAccount() {
      return ResponseEntity.notFound().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> getAccount(UUID accountId, Boolean bypass) {
      return ResponseEntity.notFound().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> changeAccountProfile(
        UUID accountId, ChangeAccountProfileRequest metadata, Boolean bypass, MultipartFile image) {
      return ResponseEntity.notFound().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Resource> getAccountPhoto(UUID accountId, Boolean bypass) {
      return ResponseEntity.notFound().build();
    }

    /** Serves a harmless canonical ingestion projection for the authentication boundary. */
    @GetMapping(CollectorOperationsApi.PATH_GET_COLLECTOR_RUNTIME)
    CollectorRuntimeInternalResponse runtime() {
      return new CollectorRuntimeInternalResponse().revision(0L).incarnationId(null);
    }

    /**
     * Exercises a service-level refusal after successful authentication, without a product
     * endpoint.
     */
    @GetMapping("/test/business-denial")
    void denied() {
      throw new AccessDeniedException("Private refusal context");
    }

    /** Stands in for the three static legal documents owned by F11. */
    @GetMapping(
        value = {"/legals/privacy", "/legals/imprint", "/legals/terms"},
        produces = "text/html")
    String legal() {
      return "<html><title>Harmless policy fixture</title></html>";
    }
  }
}
