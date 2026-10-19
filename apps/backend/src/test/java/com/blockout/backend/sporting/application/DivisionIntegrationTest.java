package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Exercises persisted lifecycle, name uniqueness and division/classification ordering. */
@SpringBootTest
@Testcontainers
@DisplayName("Division lifecycle transactions")
class DivisionIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @Autowired private DivisionService divisions;
  @Autowired private ClassificationService classifications;
  @Autowired private SportingIdentityService identities;
  @Autowired private SportingReadService reads;
  @Autowired private SeasonService seasons;
  @Autowired private AccountStore accounts;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  private UUID account;

  /**
   * Migrates a disposable PostgreSQL database before application-role validation.
   *
   * @param properties native test configuration registry
   * @throws Exception if the disposable baseline cannot be migrated
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Isolates synthetic division, sporting and account fixtures.
   *
   * @throws Exception if isolated fixture cleanup fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    try (java.sql.Connection connection =
            java.sql.DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        java.sql.Statement fixture = connection.createStatement()) {
      fixture.execute(
          "TRUNCATE sporting_season, sporting_club, sporting_division, account CASCADE");
    }
    account =
        new TransactionTemplate(transactions)
            .execute(
                state ->
                    accounts
                        .create(
                            "https://identity.example.invalid/",
                            "auth0|division",
                            "Operator_157",
                            "operator@example.invalid",
                            null)
                        .id());
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'division-lifecycle.manage'), (?, 'sporting-classification.manage')",
        account,
        account);
  }

  @Test
  @DisplayName("Rejects case-insensitive duplicate names through the actual unique index")
  void refusesDuplicateName() throws Exception {
    // Given
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "PNG", output);
    byte[] image = output.toByteArray();
    DivisionDetail original =
        divisions.create(account, "National 2", "#112233", null, image, "image/png");
    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () -> divisions.create(account, "national 2", "#445566", null, null, null);
    // Then
    assertThatThrownBy(duplicate).isInstanceOf(SportingConflictException.class);
    assertThat(divisions.list(account, true)).containsExactly(original);
    assertThat(original.hasLogo()).isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT logo FROM sporting_division WHERE id = ?", byte[].class, original.id()))
        .isEqualTo(image);
  }

  @Test
  @DisplayName("Changes activity without changing presentation and rejects stale matching commands")
  void preservesPresentationAndNoOpRevision() {
    // Given
    List<String> gradient = List.of("#112233", "#445566", "#778899");
    DivisionDetail original =
        divisions.create(account, "National 2", "#112233", gradient, null, null);
    // When
    DivisionDetail inactive = divisions.setActive(account, original.id(), "0", false);
    DivisionDetail unchanged =
        divisions.setActive(account, original.id(), Long.toString(inactive.revision()), false);
    // Then
    assertThat(inactive.active()).isFalse();
    assertThat(inactive.gradient()).isEqualTo(gradient);
    assertThat(inactive.color()).isEqualTo(original.color());
    assertThat(unchanged).isEqualTo(inactive);
    assertThat(divisions.list(account, false)).isEmpty();
    assertThat(divisions.list(account, true)).containsExactly(inactive);
    assertThatThrownBy(() -> divisions.setActive(account, original.id(), "0", false))
        .isInstanceOf(SportingConflictException.class);
    assertThat(
            divisions
                .setActive(account, original.id(), Long.toString(inactive.revision()), true)
                .active())
        .isTrue();
  }

  @ParameterizedTest
  @ValueSource(strings = {"sporting-presentation.manage", "sporting-classification.manage"})
  @DisplayName("Allows each alternative read grant without granting division lifecycle writes")
  void separatesReadAndWriteGrants(String grant) {
    // Given
    DivisionDetail division = divisions.create(account, "National 2", "#112233", null, null, null);
    sql.update("DELETE FROM account_permission WHERE account_id = ?", account);
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, ?)", account, grant);
    // When
    DivisionDetail read = divisions.get(account, division.id());
    // Then
    assertThat(read).isEqualTo(division);
    assertThat(divisions.list(account, true)).containsExactly(division);
    assertThatThrownBy(() -> divisions.requireLifecycle(account))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> divisions.setActive(account, division.id(), "0", false))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> divisions.create(account, "Another", "#112233", null, null, null))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("A successful upload preflight does not authorize creation after grant withdrawal")
  void rechecksGrantAfterUploadPreflight() {
    // Given
    divisions.requireLifecycle(account);
    sql.update(
        "DELETE FROM account_permission WHERE account_id = ? AND permission = 'division-lifecycle.manage'",
        account);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable create =
        () -> divisions.create(account, "National 2", "#112233", null, null, null);

    // Then
    assertThatThrownBy(create).isInstanceOf(AccessDeniedException.class);
    assertThat(divisions.list(account, true)).isEmpty();
  }

  @Test
  @DisplayName("Lists ordered division metadata with image presence and optional inactive entries")
  void listsDivisionMetadata() {
    // Given
    DivisionDetail beta = divisions.create(account, "Beta", "#445566", null, null, null);
    // Synthetic stored bytes qualify presence only; the shared validator owns image decoding.
    DivisionDetail alpha =
        divisions.create(
            account,
            "alpha",
            "#112233",
            List.of("#112233", "#445566", "#778899"),
            new byte[] {1, 2, 3},
            "image/png");
    DivisionDetail gamma = divisions.create(account, "gamma", "#778899", null, null, null);
    DivisionDetail inactive = divisions.setActive(account, gamma.id(), "0", false);

    // When
    List<DivisionDetail> active = divisions.list(account, false);
    List<DivisionDetail> all = divisions.list(account, true);

    // Then
    assertThat(active).containsExactly(alpha, beta);
    assertThat(all).containsExactly(alpha, beta, inactive);
    assertThat(active.getFirst().hasLogo()).isTrue();
    assertThat(active.getLast().hasLogo()).isFalse();
  }

  @Test
  @DisplayName(
      "A correction waiting on a deactivation refuses the now-inactive target without effects")
  void serializesDeactivationAndAssignment() throws Exception {
    // Given
    DivisionDetail original = divisions.create(account, "Original", "#112233", null, null, null);
    DivisionDetail target = divisions.create(account, "Target", "#445566", null, null, null);
    UUID season = seasons.getOrCreate(2026L).id();
    SportingClassification classification =
        new SportingClassification(original.id(), SportFormatEnum._6X6, SportGenderEnum.FEMALE);
    PoolView pool =
        identities.establishPool(
            new PoolKey(
                CollectionProviderEnum.FFVB, season, "organizer", "competition", null, null, "A"),
            "pack",
            "Pool",
            classification);
    ClassificationView before = classifications.pool(account, pool.id());
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> correction =
          transaction.execute(
              state -> {
                divisions.setActive(account, target.id(), "0", false);
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                change -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  classifications.setPool(
                                      account,
                                      pool.id(),
                                      before.revision(),
                                      new SportingClassification(
                                          target.id(),
                                          SportFormatEnum._6X6,
                                          SportGenderEnum.FEMALE));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return pending;
              });
      // Then
      assertThatThrownBy(() -> correction.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(SportingConflictException.class);
      assertThat(classifications.pool(account, pool.id())).isEqualTo(before);
      assertThat(reads.pool(pool.id()).orElseThrow().classification()).isEqualTo(classification);
    }
  }
}
