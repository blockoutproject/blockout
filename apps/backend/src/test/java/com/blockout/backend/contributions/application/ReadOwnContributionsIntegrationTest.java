package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real caller-only native paging and derived current context; no test transaction encloses actions.
 */
@DisplayName("Private contribution owner reads")
@Testcontainers
class ReadOwnContributionsIntegrationTest extends ContributionScenario {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();

  /**
   * Migrates this suite's disposable database before wiring its real application services.
   *
   * @param properties native Spring datasource properties for this container
   * @throws Exception if role initialization or the production migration fails
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** {@inheritDoc} */
  @Override
  protected PostgreSQLContainer databaseContainer() {
    return DATABASE;
  }

  @Test
  @DisplayName("Foreign members remain unavailable while collection reads include only the caller")
  void hidesForeignHistory() {
    // Given
    SubmitContribution.Outcome created = submit(AUTHOR, "0", "https://youtube.com/one", false);

    // When
    ReadOwnContributions.Page own = reads.read(OTHER, matchId, 0);

    // Then
    assertThat(own.versions().items()).isEmpty();
    assertThatThrownBy(() -> reads.member(OTHER, matchId, created.version().id()))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThat(reads.member(AUTHOR, matchId, created.version().id()).version().id())
        .isEqualTo(created.version().id());
  }

  @Test
  @DisplayName("A twenty-item Slice uses a stable UUID tie-break and independent aggregate usage")
  void pagesTiedVersions() {
    // Given: moderator-exempt fixture versions exceed one page without violating ordinary quotas.
    TransactionTemplate tx = new TransactionTemplate(transactions);
    tx.executeWithoutResult(
        status -> {
          for (int n = 0; n < 22; n++)
            contributions.record(
                matchId, AUTHOR, new StreamAddress("https://youtube.com/" + n), true, true, NOW);
        });

    // When
    ReadOwnContributions.Page first = reads.read(AUTHOR, matchId, 0);
    ReadOwnContributions.Page second = reads.read(AUTHOR, matchId, 1);

    // Then
    assertThat(first.versions().items()).hasSize(20);
    assertThat(first.versions().hasNext()).isTrue();
    assertThat(second.versions().items()).hasSize(2);
    assertThat(second.versions().hasNext()).isFalse();
    List<UUID> ids =
        java.util.stream.Stream.concat(
                first.versions().items().stream(), second.versions().items().stream())
            .map(ContributionVersion::id)
            .toList();
    // PostgreSQL UUID ordering is unsigned byte order, independent of Java UUID.compareTo.
    assertThat(ids.stream().map(UUID::toString).toList()).isSorted().doesNotHaveDuplicates();
    assertThat(first.usage().versionsUsed()).isZero();
  }

  @Test
  @DisplayName("Current hiding revokes both collection and member access")
  void rejectsHiddenMatch() {
    // Given
    SubmitContribution.Outcome created = submit(AUTHOR, "0", "https://youtube.com/one", false);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);

    // When / Then
    assertThatThrownBy(() -> reads.read(AUTHOR, matchId, 0))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThatThrownBy(() -> reads.member(AUTHOR, matchId, created.version().id()))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }
}
