package com.blockout.backend.access.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.images.builder.Transferable;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Executes the actual runbook SQL with native psql in this suite's disposable migrated database.
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Owner-only manual grant SQL")
class ManualGrantOperationsIntegrationTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000287");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private CurrentPermissions permissions;

  /** Clears only the suite's fictitious account, leaving migrated global settings intact. */
  @BeforeEach
  void resetAccount() {
    sql.update("DELETE FROM account");
  }

  @Test
  @DisplayName("Native grant and revoke batches commit idempotently for an existing business UUID")
  void changesExistingAccount() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', 'auth0|287', 'Operator287', 'synthetic@example.invalid')",
        ACCOUNT);

    // When
    ExecResult granted = run(0);
    ExecResult repeatedGrant = run(0);

    // Then
    assertThat(granted.getExitCode()).isZero();
    assertThat(repeatedGrant.getExitCode()).isZero();
    assertThat(permissions.forAccount(ACCOUNT)).containsExactly(Permission.MANAGE_MAINTENANCE);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account_permission", Long.class))
        .isEqualTo(1);

    // When
    ExecResult revoked = run(1);
    ExecResult repeatedRevoke = run(1);

    // Then
    assertThat(revoked.getExitCode()).isZero();
    assertThat(repeatedRevoke.getExitCode()).isZero();
    assertThat(permissions.forAccount(ACCOUNT)).isEmpty();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM access_settings", Long.class)).isEqualTo(2);
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1})
  @DisplayName("Both native batches stop and roll back when their original target is absent")
  void refusesAbsentAccount(int script) throws Exception {
    // Given
    UUID replacement = UUID.fromString("00000000-0000-4000-8000-000000000288");
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', 'auth0|287', 'Replacement287', 'synthetic@example.invalid')",
        replacement);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'maintenance.manage')",
        replacement);

    // When
    ExecResult result = run(script);

    // Then
    assertThat(result.getExitCode()).isEqualTo(3);
    assertThat(permissions.forAccount(ACCOUNT)).isEmpty();
    assertThat(permissions.forAccount(replacement)).containsExactly(Permission.MANAGE_MAINTENANCE);
  }

  /**
   * Executes the documented grant or revoke block unchanged, using only isolated fixture inputs.
   * The container's native psql avoids requiring a host installation or exposing credentials.
   *
   * @param script zero for grant, one for revoke, in their runbook order
   * @return native process outcome; output contains only fictitious fixture data
   * @throws Exception if the runbook cannot be loaded or native execution is unavailable
   */
  private ExecResult run(int script) throws Exception {
    Path guide = Path.of(System.getProperty("basedir"), "../../infra/operations/README.md");
    String section =
        Files.readString(guide)
            .split("## Owner-only action grants", 2)[1]
            .split("## Ordinary owner recovery", 2)[0];
    String sqlScript = section.split("```sql\\R")[script + 1].split("```", 2)[0];
    database.copyFileToContainer(Transferable.of(sqlScript), "/tmp/manual-grant.sql");
    return database.execInContainer(
        "psql",
        "-X",
        "-U",
        "blockout_app",
        "-d",
        "blockout",
        "-v",
        "ON_ERROR_STOP=1",
        "-v",
        "account_id=" + ACCOUNT,
        "-v",
        "permission=maintenance.manage",
        "-f",
        "/tmp/manual-grant.sql");
  }
}
