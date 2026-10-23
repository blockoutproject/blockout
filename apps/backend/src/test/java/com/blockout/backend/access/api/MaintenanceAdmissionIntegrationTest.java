package com.blockout.backend.access.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.UUID;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Actual Spring security, grants, settings, operations and migrated PostgreSQL. A test-owned
 * ordinary read observes admission without pretending to qualify the unfinished discovery consumer.
 */
@SpringBootTest(
    properties = {
      "blockout.legacy.min-version-ios=2.0.0",
      "blockout.legacy.min-version-android=2.0.0",
      "blockout.legacy.store-url-ios=https://apps.apple.com/app/id123456",
      "blockout.legacy.store-url-android=https://play.google.com/store/apps/details?id=com.blockout.app"
    })
@AutoConfigureMockMvc
@Testcontainers
@Import(MaintenanceAdmissionIntegrationTest.OrdinaryRead.class)
@DisplayName("Current SQL maintenance across shared HTTP admission")
class MaintenanceAdmissionIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000177");
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate sql;
  @Autowired private MaintenanceAdmission admission;
  @Autowired private PlatformTransactionManager transactions;

  /**
   * Migrates this suite's disposable database before the restricted application connection opens.
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Restores only the disposable account and settings used by this suite. */
  @BeforeEach
  void prepare() {
    sql.update("DELETE FROM account");
    sql.update(
        "UPDATE access_settings SET active=true, revision=3, message='Pause en cours', image_url=NULL WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'auth0|177', 'Operator_177', 'operator@example.invalid')",
        ACCOUNT);
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"false"})
  @DisplayName("Blocks public business reads without explicit bypass even for a granted operator")
  void requiresExplicitIntent(String intent) throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);
    MockHttpServletRequestBuilder request = get("/clubs").with(principal());
    if (intent != null) request.header("Blockout-Maintenance-Bypass", intent);

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"))
        .andExpect(jsonPath("$.maintenance.active").value(true))
        .andExpect(jsonPath("$.maintenance.message").value("Pause en cours"))
        .andExpect(jsonPath("$.maintenance.revision").value(3))
        .andExpect(header().doesNotExist("Retry-After"));
  }

  @Test
  @DisplayName(
      "Requires credentials for guest bypass without making the public read private when inactive")
  void checksGuestBypass() throws Exception {
    // Given / When
    mvc.perform(get("/clubs").header("Blockout-Maintenance-Bypass", "true"))
        // Then
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("WWW-Authenticate", org.hamcrest.Matchers.startsWith("Bearer")));
    sql.update("UPDATE access_settings SET active=false, revision=4 WHERE id='maintenance'");
    mvc.perform(get("/clubs").header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Checks the current bypass grant and exact usable lifecycle on each public read")
  void rechecksCurrentGrant() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);

    // When
    mvc.perform(get("/clubs").with(principal()).header("Blockout-Maintenance-Bypass", "true"))
        // Then
        .andExpect(status().isOk());
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);
    mvc.perform(get("/clubs").with(principal()).header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isForbidden());
    sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
    mvc.perform(get("/clubs").with(principal()).header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Keeps management, versions, domain rights and ordinary bypass independent")
  void keepsGrantsIndependent() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.manage')",
        ACCOUNT);

    // When
    mvc.perform(get("/administration/maintenance").with(principal()))
        // Then
        .andExpect(status().isOk());
    mvc.perform(get("/administration/application-versions").with(principal()))
        .andExpect(status().isForbidden());
    mvc.perform(get("/administration/divisions").with(principal()))
        .andExpect(status().isForbidden());
    mvc.perform(get("/clubs").with(principal()).header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isForbidden());
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.bypass')",
        ACCOUNT);
    mvc.perform(get("/administration/maintenance").with(principal()))
        .andExpect(status().isForbidden());
    mvc.perform(
            get("/administration/divisions")
                .with(principal())
                .header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Uses committed activation on the next admission and the in-process read")
  void observesActivation() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=false WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.manage')",
        ACCOUNT);
    mvc.perform(get("/clubs")).andExpect(status().isOk());

    // When
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(principal())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":3,\"active\":true}"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(4));
    mvc.perform(get("/clubs"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.maintenance.revision").value(4));
    assertThat(admission.currentMaintenance().active()).isTrue();
    assertThat(admission.currentMaintenance().revision()).isEqualTo(4);
  }

  @Test
  @DisplayName("Reads committed maintenance afresh even inside a longer caller transaction")
  void readsCurrentWithinCallerTransaction() {
    // Given
    sql.update("UPDATE access_settings SET active=false WHERE id='maintenance'");
    TransactionTemplate caller = new TransactionTemplate(transactions);
    TransactionTemplate activation = new TransactionTemplate(transactions);
    activation.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

    // When
    caller.executeWithoutResult(
        status -> {
          assertThat(admission.currentMaintenance().active()).isFalse();
          activation.executeWithoutResult(
              change ->
                  sql.update(
                      "UPDATE access_settings SET active=true, revision=4 WHERE id='maintenance'"));

          // Then
          assertThat(admission.currentMaintenance().active()).isTrue();
          assertThat(admission.currentMaintenance().revision()).isEqualTo(4);
        });
  }

  @Test
  @DisplayName("Keeps public configuration, existing identification and health readable")
  void preservesPublicExceptions() throws Exception {
    // Given / When
    mvc.perform(get("/application-access"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(true));
    mvc.perform(get("/accounts/me").with(principal())).andExpect(status().isOk());
    mvc.perform(get("/health")).andExpect(status().isOk());
    mvc.perform(
            get("/api/v1/mobile/public/config/app-status")
                .header("Authorization", "Bearer obsolete"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance").value(false));
  }

  @Test
  @DisplayName("Keeps ingestion authorization separate from mobile admission")
  void preservesIngestion() throws Exception {
    // Given / When
    mvc.perform(
            get("/ingestion/collector-runtime")
                .with(
                    jwt()
                        .jwt(token -> token.claim("azp", "collector-test"))
                        .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest"))))
        // Then
        .andExpect(status().isOk());
    mvc.perform(get("/ingestion/collector-runtime").with(principal()))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Never fabricates maintenance from invalid current SQL configuration")
  void keepsInvalidStateUnavailable() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET message=' ' WHERE id='maintenance'");

    // When
    mvc.perform(get("/clubs"))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.maintenance").doesNotExist());
    org.assertj.core.api.Assertions.assertThatThrownBy(() -> admission.currentMaintenance())
        .isInstanceOf(AccessSettingsUnavailableException.class);
  }

  /** Returns an already validated test mobile principal; signature validation has its own suite. */
  private static RequestPostProcessor principal() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("auth0|177")
                    .claim("azp", "mobile-test"));
  }

  /**
   * Observes shared admission for a public ordinary resource whose domain consumer is future work.
   */
  @RestController
  static class OrdinaryRead {
    /** Returns only a bounded marker once shared admission has passed. */
    @GetMapping("/clubs")
    String read() {
      return "admitted";
    }
  }
}
