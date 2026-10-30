package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import java.net.URI;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/** Real command commit and current F05 attribution with a controlled post-commit account change. */
@Import(SubmitModeratedContributionIntegrationTest.AttributionConfiguration.class)
@DisplayName("Moderator publication result ownership")
class SubmitModeratedContributionIntegrationTest extends ContributionScenario {

  @Autowired private SubmitModeratedContribution moderated;
  @Autowired private ChangeAttributionAfterCommit attribution;

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Reads current attribution after publication has committed")
  void readsAttributionAfterCommit(boolean erased) {
    // Given
    moderator(AUTHOR);
    follow(FOLLOWER);
    attribution.erase = erased;

    // When
    SubmitModeratedContribution.Result result =
        moderated.submit(AUTHOR, matchId, "0", URI.create("https://youtube.com/moderated"));

    // Then
    assertThat(result.contribution().created()).isTrue();
    assertThat(result.displayName()).isEqualTo(erased ? null : "ChangedAfterCommit");
    assertThat(count("contribution_version")).isEqualTo(1);
  }

  @Test
  @DisplayName("Refuses an enclosing transaction before moderator publication")
  void refusesEnclosingTransaction() {
    // Given
    moderator(AUTHOR);
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    ThrowingCallable invoke =
        () ->
            transaction.executeWithoutResult(
                status ->
                    moderated.submit(
                        AUTHOR, matchId, "0", URI.create("https://youtube.com/moderated")));

    // Then
    assertThatThrownBy(invoke).isInstanceOf(IllegalTransactionStateException.class);
    assertThat(count("contribution_version")).isZero();
  }

  /** Installs only a controlled listener for the actual committed announcement handoff. */
  @TestConfiguration(proxyBeanMethods = false)
  static class AttributionConfiguration {
    /**
     * Supplies a separate account mutation after the real publication transaction commits.
     *
     * @param sql actual migrated database access
     * @param transactions native manager for the independent post-commit transaction
     * @return test-only attribution mutation
     */
    @Bean
    ChangeAttributionAfterCommit attribution(
        JdbcTemplate sql, PlatformTransactionManager transactions) {
      return new ChangeAttributionAfterCommit(sql, transactions);
    }
  }

  /**
   * Controlled concurrent-account outcome; no provider, account erasure workflow or retry is
   * modeled.
   */
  static class ChangeAttributionAfterCommit {
    private final JdbcTemplate sql;
    private final TransactionTemplate transaction;
    private boolean erase;

    /**
     * Uses a new native transaction because after-commit resources can still be bound to the
     * thread.
     *
     * @param sql real database access
     * @param transactions native transaction manager
     */
    ChangeAttributionAfterCommit(JdbcTemplate sql, PlatformTransactionManager transactions) {
      this.sql = sql;
      transaction = new TransactionTemplate(transactions);
      transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Changes attribution only after observing the accepted version from an independent
     * transaction.
     *
     * @param event actual committed allocations from the moderator publication
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void ready(AfterCommitAnnouncements.Ready event) {
      transaction.executeWithoutResult(
          status -> {
            assertThat(sql.queryForObject("SELECT COUNT(*) FROM contribution_version", Long.class))
                .isEqualTo(1);
            if (erase) sql.update("DELETE FROM account WHERE id=?", AUTHOR);
            else sql.update("UPDATE account SET username='ChangedAfterCommit' WHERE id=?", AUTHOR);
          });
    }
  }
}
