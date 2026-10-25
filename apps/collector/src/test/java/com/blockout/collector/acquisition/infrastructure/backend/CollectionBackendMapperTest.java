package com.blockout.collector.acquisition.infrastructure.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CompleteCollectionCycleInternalRequest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Exercises offset conversion through the generated mapper's actual read and write boundaries. */
@DisplayName("Collection transport temporal mapping")
class CollectionBackendMapperTest {
  private final CollectionBackendMapper mapper = new CollectionBackendMapperImpl();

  @Test
  @DisplayName("Reads the absolute completion instant with nanosecond precision")
  void preservesOffsetInstant() {
    // Given
    CollectionCycleInternalResponse source =
        cycle(CollectionCycleStateEnum.COMPLETED)
            .completedAt(OffsetDateTime.parse("2026-10-25T00:30:15.123456789+02:00"));

    // When
    CollectionBackend.Cycle cycle = mapper.toView(source);

    // Then
    assertThat(cycle.completedAt()).isEqualTo(Instant.parse("2026-10-24T22:30:15.123456789Z"));
  }

  @Test
  @DisplayName("Writes a completion instant as a UTC transport timestamp")
  void writesUtcCompletion() {
    // Given
    Instant completedAt = Instant.parse("2026-10-24T22:30:15.123456789Z");

    // When
    CompleteCollectionCycleInternalRequest completion = mapper.toDto(completedAt);

    // Then
    assertThat(completion.getCompletedAt())
        .isEqualTo(OffsetDateTime.parse("2026-10-24T22:30:15.123456789Z"));
    assertThat(completion.getCompletedAt().getOffset()).isEqualTo(ZoneOffset.UTC);
  }

  @Test
  @DisplayName("Does not invent a completion instant for running work")
  void preservesMissingCompletion() {
    // Given
    CollectionCycleInternalResponse source = cycle(CollectionCycleStateEnum.RUNNING);

    // When
    CollectionBackend.Cycle cycle = mapper.toView(source);

    // Then
    assertThat(cycle.completedAt()).isNull();
  }

  /**
   * Supplies a complete controlled control-cycle response with no completion time.
   *
   * @param state scenario-owned backend lifecycle state
   * @return valid control context without candidate or invented timestamps
   */
  private static CollectionCycleInternalResponse cycle(CollectionCycleStateEnum state) {
    return new CollectionCycleInternalResponse()
        .id(UUID.fromString("00000000-0000-4000-8000-000000000511"))
        .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000512"))
        .controlId(UUID.fromString("00000000-0000-4000-8000-000000000513"))
        .cycleOrder(1L)
        .mode(CollectionModeEnum.MANUAL)
        .state(state)
        .startedAt(OffsetDateTime.parse("2026-10-24T21:00:00Z"));
  }
}
