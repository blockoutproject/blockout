package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.util.Set;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real Spring proxies and PostgreSQL transactions with the external projection writer controlled.
 */
@SpringBootTest
@Import({
  PostgresTestConfiguration.class,
  ProjectSearchTransactionIntegrationTest.ProjectionConfiguration.class
})
@DisplayName("Projection external-work transaction boundary")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ProjectSearchTransactionIntegrationTest {
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private ProjectSearch projection;
  @MockitoBean private SearchProjectionWriter writer;

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Refuses an enclosing SQL transaction before any external projection effect")
  void refusesEnclosingTransaction(boolean fullRebuild) {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    Set<SportingProjectionChanges.Scope> scopes =
        Set.of(
            new SportingProjectionChanges.Scope(
                SportingProjectionChanges.Kind.CLUB,
                UUID.fromString("00000000-0000-4000-8000-000000000001")));

    // When
    ThrowingCallable invoke =
        () ->
            transaction.executeWithoutResult(
                status -> {
                  if (fullRebuild) projection.rebuild();
                  else projection.update(scopes);
                });

    // Then
    assertThatThrownBy(invoke).isInstanceOf(IllegalTransactionStateException.class);
    verifyNoInteractions(writer);
  }

  /**
   * Enables only the real application owner, leaving engine configuration and scheduling absent.
   */
  @TestConfiguration(proxyBeanMethods = false)
  static class ProjectionConfiguration {
    /**
     * Registers the application owner through Spring's actual transaction proxy.
     *
     * @param sporting real owner-controlled SQL reads
     * @param writer controlled external boundary
     * @return projection orchestration with the production NEVER policy
     */
    @Bean
    ProjectSearch projection(ReadSportingData sporting, SearchProjectionWriter writer) {
      return new ProjectSearch(sporting, writer);
    }
  }
}
