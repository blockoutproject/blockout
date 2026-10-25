package com.blockout.backend.access.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.AccountAdmission;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockPart;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Real HTTP, F12 wiring and migrated PostgreSQL; only the external principal reader is controlled.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Account maintenance admission wiring")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AccountMaintenanceAdmissionIntegrationTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000175");
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate sql;
  @MockitoBean private PrincipalReader provider;
  @MockitoSpyBean private AccountAdmission admission;

  /** Restores only this disposable database's account and maintenance fixtures. */
  @BeforeEach
  void prepare() {
    sql.update("DELETE FROM account");
    sql.update(
        "UPDATE access_settings SET revision=0, active=false, message='Prepared', image_url=NULL WHERE id='maintenance'");
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"true", "false"})
  @DisplayName("Establishes a first profile while inactive, independently of bypass intent")
  void establishesWhileInactive(String intent) throws Exception {
    // Given
    when(provider.read(ISSUER, "auth0|signup"))
        .thenReturn(new PrincipalReader.Evidence("signup@example.invalid", null, List.of()));

    MockHttpServletRequestBuilder request = post("/accounts").with(principal("auth0|signup"));
    if (intent != null) request.header("Blockout-Maintenance-Bypass", intent);

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.permissions.manageMaintenance").value(false));
  }

  @ParameterizedTest
  @ValueSource(strings = {"establish", "original", "photo", "edit", "erase"})
  @DisplayName("Refuses every ordinary account operation with the observed active maintenance")
  void refusesOrdinaryAccountOperation(String operation) throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true, revision=3 WHERE id='maintenance'");
    AbstractMockHttpServletRequestBuilder<?> request =
        switch (operation) {
          case "establish" -> post("/accounts");
          case "original" -> get("/accounts/" + ACCOUNT);
          case "photo" -> get("/accounts/" + ACCOUNT + "/photo");
          case "edit" ->
              multipart(HttpMethod.PATCH, "/accounts/" + ACCOUNT)
                  .part(
                      new MockPart(
                          "metadata",
                          null,
                          "{}".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                          org.springframework.http.MediaType.APPLICATION_JSON));
          case "erase" -> delete("/accounts/" + ACCOUNT);
          default -> throw new IllegalArgumentException("Unknown scenario");
        };

    // When
    mvc.perform(request.with(principal("auth0|signup")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().doesNotExist("Retry-After"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"))
        .andExpect(jsonPath("$.status").value(503))
        .andExpect(jsonPath("$.maintenance.active").value(true))
        .andExpect(jsonPath("$.maintenance.revision").value(3))
        .andExpect(jsonPath("$.maintenance.message").value("Prepared"));
    verifyNoInteractions(provider);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isZero();
  }

  @Test
  @DisplayName("Keeps current-account identification available without automatic establishment")
  void identifiesDuringMaintenance() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
        ACCOUNT,
        ISSUER,
        "auth0|existing",
        "Existing_175",
        "existing@example.invalid");

    // When
    mvc.perform(get("/accounts/me").with(principal("auth0|existing")))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(ACCOUNT.toString()));
    mvc.perform(get("/accounts/me").with(principal("auth0|unknown")))
        .andExpect(status().isNotFound());
    verifyNoInteractions(provider);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(1L);
  }

  @Test
  @DisplayName("Requires a current bypass grant on the exact existing business lifecycle")
  void checksCurrentBypassGrant() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
        ACCOUNT,
        ISSUER,
        "auth0|existing",
        "Existing_175",
        "existing@example.invalid");
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);

    // When
    mvc.perform(
            get("/accounts/" + ACCOUNT)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("auth0|existing")))
        // Then
        .andExpect(status().isOk());
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);
    mvc.perform(
            get("/accounts/" + ACCOUNT)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("auth0|existing")))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/accounts")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("auth0|unknown")))
        .andExpect(status().isForbidden());
    verifyNoInteractions(provider);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Does not transfer an admitted bypass to a missing or replacement business lifecycle")
  void bindsBypassToOriginalLifecycle(boolean replace) throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
        ACCOUNT,
        ISSUER,
        "auth0|existing",
        "Original_175",
        "original@example.invalid");
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);
    UUID replacement = UUID.fromString("00000000-0000-4000-8000-000000000999");
    when(provider.read(ISSUER, "auth0|existing"))
        .thenReturn(new PrincipalReader.Evidence("provider@example.invalid", null, List.of()));
    doAnswer(
            call -> {
              Object admitted = call.callRealMethod();
              // Suspend at the actual admission/application boundary, before F05 captures its
              // lifecycle.
              sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
              if (replace) {
                sql.update(
                    "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
                    replacement,
                    ISSUER,
                    "auth0|existing",
                    "Replacement_175",
                    "replacement@example.invalid");
              }
              return admitted;
            })
        .when(admission)
        .requireOrdinaryAccess(ISSUER, "auth0|existing", true);

    // When
    mvc.perform(
            post("/accounts")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("auth0|existing")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"));
    verifyNoInteractions(provider);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class))
        .isEqualTo(replace ? 1L : 0L);
    if (replace) {
      assertThat(
              sql.queryForObject("SELECT email FROM account WHERE id=?", String.class, replacement))
          .isEqualTo("replacement@example.invalid");
    }
  }

  @Test
  @DisplayName("Refreshes only the original existing profile admitted by current bypass")
  void establishesAdmittedOriginal() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
        ACCOUNT,
        ISSUER,
        "auth0|existing",
        "Original_175",
        "original@example.invalid");
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);
    when(provider.read(ISSUER, "auth0|existing"))
        .thenReturn(new PrincipalReader.Evidence("current@example.invalid", null, List.of()));

    // When
    mvc.perform(
            post("/accounts")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("auth0|existing")))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(ACCOUNT.toString()))
        .andExpect(jsonPath("$.permissions.bypassMaintenance").value(true));
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(1L);
    assertThat(sql.queryForObject("SELECT email FROM account WHERE id=?", String.class, ACCOUNT))
        .isEqualTo("current@example.invalid");
  }

  @Test
  @DisplayName("Keeps original ownership checks after successful maintenance bypass")
  void preservesOrdinaryOwnership() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
        ACCOUNT,
        ISSUER,
        "auth0|existing",
        "Existing_175",
        "existing@example.invalid");
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);

    // When
    mvc.perform(
            get("/accounts/00000000-0000-4000-8000-000000000999")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("auth0|existing")))
        // Then
        .andExpect(status().isNotFound());
    verifyNoInteractions(provider);
  }

  @ParameterizedTest
  @ValueSource(strings = {"1", "yes", "on", "TRUE", "", "true,false"})
  @DisplayName("Rejects noncanonical bypass syntax before provider or account effects")
  void rejectsInvalidBypass(String intent) throws Exception {
    // Given / When
    mvc.perform(
            post("/accounts")
                .header("Blockout-Maintenance-Bypass", intent)
                .with(principal("auth0|signup")))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(provider);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isZero();
  }

  @Test
  @DisplayName("Keeps invalid stored maintenance unavailable rather than allowing profile creation")
  void refusesInvalidConfiguration() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET message=' ' WHERE id='maintenance'");

    // When
    mvc.perform(post("/accounts").with(principal("auth0|signup")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.maintenance").doesNotExist());
    verifyNoInteractions(provider);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isZero();
  }

  @Test
  @DisplayName("Lets an admitted establishment finish while refusing new work after activation")
  void ordersAdmissionBeforeProviderIo() throws Exception {
    // Given
    CountDownLatch providerStarted = new CountDownLatch(1);
    CountDownLatch releaseProvider = new CountDownLatch(1);
    when(provider.read(ISSUER, "auth0|signup"))
        .thenAnswer(
            call -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              providerStarted.countDown();
              assertThat(releaseProvider.await(10, TimeUnit.SECONDS)).isTrue();
              return new PrincipalReader.Evidence("signup@example.invalid", null, List.of());
            });

    // When
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<ResultActions> admitted =
          worker.submit(() -> mvc.perform(post("/accounts").with(principal("auth0|signup"))));
      try {
        assertThat(providerStarted.await(10, TimeUnit.SECONDS)).isTrue();
        sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
        mvc.perform(post("/accounts").with(principal("auth0|later")))
            // Then
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
      } finally {
        releaseProvider.countDown();
      }
      admitted.get(15, TimeUnit.SECONDS).andExpect(status().isCreated());
    }
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(1L);
  }

  /**
   * Supplies a validated synthetic mobile principal; separate security tests own signature checks.
   *
   * @param subject exact scenario-owned principal identity
   * @return the native Spring Security request postprocessor
   */
  private static RequestPostProcessor principal(String subject) {
    return jwt().jwt(token -> token.issuer(ISSUER).subject(subject).claim("azp", "mobile-test"));
  }
}
