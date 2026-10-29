package com.blockout.collector.acquisition.infrastructure.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.CompleteCollectionCycleInternalRequest;
import com.blockout.collector.generated.ingestion.model.SportFormatEnum;
import com.blockout.collector.generated.ingestion.model.SportGenderEnum;
import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Exercises generated mapping of acquisition context and actual read/write timestamps. */
@DisplayName("Collection transport mapping")
class CollectionBackendMapperTest {
  private final CollectionBackendMapper mapper = new CollectionBackendMapperImpl();

  @Test
  @DisplayName("Preserves exact admitted provider references without repeating backend selection")
  void preservesProviderContext() {
    // Given
    UUID poolId = UUID.fromString("00000000-0000-4000-8000-000000000521");
    UUID bindingId = UUID.fromString("00000000-0000-4000-8000-000000000522");
    URI url =
        URI.create(
            "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?codent=ABCD&po=001");
    CollectionTargetInternalResponse source =
        new CollectionTargetInternalResponse()
            .scopeId(poolId)
            .kind(CollectionTargetKindEnum.CALENDAR)
            .sourceBindingId(bindingId)
            .url(url)
            .seasonLabel("2026/2027")
            .competitionReference("001")
            .packReference("002")
            .poolReference("003")
            .tourReference("01")
            .groupReference("04")
            .poolId(poolId)
            .provider(CollectionProviderEnum.FFVB)
            .organizerReference("ABCD")
            .divisionId(UUID.fromString("00000000-0000-4000-8000-000000000523"))
            .format(SportFormatEnum._6X6)
            .gender(SportGenderEnum.FEMALE)
            .lastAttemptAt(OffsetDateTime.parse("2026-10-24T20:00:00Z"))
            .lastSuccessAt(OffsetDateTime.parse("2026-10-24T19:00:00Z"))
            .fastWindowEndsAt(OffsetDateTime.parse("2026-10-25T01:00:00Z"));

    // When
    CollectionBackend.Target target = mapper.toView(source);

    // Then
    assertThat(target.scopeId()).isEqualTo(poolId);
    assertThat(target.kind()).isEqualTo(CollectionTargetKindEnum.CALENDAR);
    assertThat(target.sourceBindingId()).isEqualTo(bindingId);
    assertThat(target.url()).isEqualTo(url);
    assertThat(target.seasonLabel()).isEqualTo("2026/2027");
    assertThat(target.competitionReference()).isEqualTo("001");
    assertThat(target.poolReference()).isEqualTo("003");
    assertThat(target.tourReference()).isEqualTo("01");
    assertThat(target.groupReference()).isEqualTo("04");
    assertThat(target.poolId()).isEqualTo(poolId);
    assertThat(target.provider()).isEqualTo(CollectionProviderEnum.FFVB);
    assertThat(target.organizerReference()).isEqualTo("ABCD");
  }

  @Test
  @DisplayName("Preserves current locality revision and exact postal context for geocoding")
  void preservesCurrentLocality() {
    // Given
    UUID clubId = UUID.fromString("00000000-0000-4000-8000-000000000524");
    CollectionTargetInternalResponse source =
        new CollectionTargetInternalResponse()
            .scopeId(clubId)
            .kind(CollectionTargetKindEnum.GEOCODING)
            .clubId(clubId)
            .clubReference("00042")
            .localityRevision("revision-0003")
            .municipality("Saint-Étienne")
            .postalCode("01000");

    // When
    CollectionBackend.Target target = mapper.toView(source);

    // Then
    assertThat(target.scopeId()).isEqualTo(clubId);
    assertThat(target.kind()).isEqualTo(CollectionTargetKindEnum.GEOCODING);
    assertThat(target.clubId()).isEqualTo(clubId);
    assertThat(target.clubReference()).isEqualTo("00042");
    assertThat(target.localityRevision()).isEqualTo("revision-0003");
    assertThat(target.municipality()).isEqualTo("Saint-Étienne");
    assertThat(target.postalCode()).isEqualTo("01000");
  }

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
