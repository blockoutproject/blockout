package com.blockout.backend.collection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.collection.application.model.InitialReconstructionReport;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.InitialReconstructionService;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.operations.InitialReconstructionProperties;
import com.blockout.backend.collection.operations.InitialReconstructionRunner;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.json.JsonMapper;

/** Native Boot binding and single-action dispatch, without SQL or provider collaborators. */
@DisplayName("Non-web reconstruction operator inputs")
class InitialReconstructionRunnerTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner().withUserConfiguration(Binding.class);

  @Test
  @DisplayName("Refuses an omitted operator instead of granting bootstrap access")
  void requiresOperator() {
    // Given
    ApplicationContextRunner missingOperator =
        context.withPropertyValues(
            "blockout.reconstruction.action=report",
            "blockout.reconstruction.season-id=00000000-0000-4000-8000-000000000258");

    // When
    missingOperator.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }

  @Test
  @DisplayName("Refuses a prepare action without an explicit sporting start year")
  void neverGuessesYear() {
    // Given
    ApplicationContextRunner noYear =
        context.withPropertyValues(
            "blockout.reconstruction.operator=00000000-0000-4000-8000-000000000257",
            "blockout.reconstruction.action=prepare",
            "blockout.reconstruction.provider=FFVB",
            "blockout.reconstruction.organizer-reference=ABCCS",
            "blockout.reconstruction.candidate-url=https://www.ffvbbeach.org/archive");

    // When
    noYear.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }

  @ParameterizedTest
  @ValueSource(strings = {"scope=00000000-0000-4000-8000-000000000259", "scopes="})
  @DisplayName("Refuses a misspelled or blank narrower selection instead of widening it")
  void refusesAmbiguousSelection(String selection) {
    // Given
    ApplicationContextRunner request =
        context.withPropertyValues(
            "blockout.reconstruction.operator=00000000-0000-4000-8000-000000000257",
            "blockout.reconstruction.action=request",
            "blockout.reconstruction.season-id=00000000-0000-4000-8000-000000000258",
            "blockout.reconstruction.revision=0",
            "blockout.reconstruction.sources=00000000-0000-4000-8000-000000000259",
            "blockout.reconstruction." + selection);

    // When
    request.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }

  @Test
  @DisplayName("An omitted narrower selection explicitly requests only the supplied roots")
  void dispatchesWholeSelectedRoots() {
    // Given
    InitialReconstructionService service = mock(InitialReconstructionService.class);
    UUID operator = UUID.fromString("00000000-0000-4000-8000-000000000257");
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000258");
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000259");
    ApplicationContextRunner request =
        context.withPropertyValues(
            "blockout.reconstruction.operator=" + operator,
            "blockout.reconstruction.action=request",
            "blockout.reconstruction.season-id=" + season,
            "blockout.reconstruction.revision=0",
            "blockout.reconstruction.sources=" + source);

    // When
    request.run(
        application ->
            new InitialReconstructionRunner(
                    application.getBean(InitialReconstructionProperties.class),
                    service,
                    mock(PrepareCollectionSources.class),
                    mock(CloseCollectionSeason.class),
                    JsonMapper.builder().build())
                .run(new DefaultApplicationArguments()));

    // Then
    verify(service).request(operator, season, 0, Set.of(source), Set.of());
  }

  @Test
  @DisplayName(
      "Dispatches a bounded report to the existing current-permission application boundary")
  void dispatchesReport() {
    // Given
    InitialReconstructionService service = mock(InitialReconstructionService.class);
    UUID operator = UUID.fromString("00000000-0000-4000-8000-000000000257");
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000258");
    when(service.report(operator, season, 0, 200))
        .thenReturn(
            new InitialReconstructionReport(
                new CollectionSeasonView(
                    season, "2023/2024", 2023, CollectionSeasonStateEnum.PREPARING, 0),
                List.of(),
                List.of(),
                new InitialCoverage.Page(List.of(), 0, false)));
    ApplicationContextRunner report =
        context.withPropertyValues(
            "blockout.reconstruction.operator=" + operator,
            "blockout.reconstruction.action=report",
            "blockout.reconstruction.season-id=" + season);

    // When
    report.run(
        application -> {
          InitialReconstructionRunner runner =
              new InitialReconstructionRunner(
                  application.getBean(InitialReconstructionProperties.class),
                  service,
                  mock(PrepareCollectionSources.class),
                  mock(CloseCollectionSeason.class),
                  JsonMapper.builder().build());
          runner.run(new DefaultApplicationArguments());
        });

    // Then
    verify(service).report(operator, season, 0, 200);
  }

  /** Imports only the native configuration binder and Bean Validation. */
  @TestConfiguration(proxyBeanMethods = false)
  @EnableConfigurationProperties(InitialReconstructionProperties.class)
  static class Binding {}
}
