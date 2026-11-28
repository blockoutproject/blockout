package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.ingestion.model.InformationSheetInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchDetailObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchSetScoreInternalRequest;
import com.blockout.backend.generated.ingestion.model.ObservationContextInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.domain.MatchFacts;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.openapitools.jackson.nullable.JsonNullable;

/** Exercises values crossing from generated transport objects into immutable application input. */
@DisplayName("Sporting observation mapping")
class SportingObservationMapperTest {
  private final SportingObservationMapper mapper =
      Mappers.getMapper(SportingObservationMapper.class);
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000001");

  @Test
  @DisplayName("Preserves omitted facts without supplying defaults")
  void preservesOmittedFacts() {
    // Given
    MatchDetailObservationInternalRequest request = request(new MatchFactsInternalRequest());

    // When
    MatchObservation result = mapper.toObservation(MATCH, request);

    // Then
    assertThat(result.facts().localDate().isUndefined()).isTrue();
    assertThat(result.facts().result().isUndefined()).isTrue();
    assertThat(result.facts().sets().isUndefined()).isTrue();
    assertThat(result.facts().informationSheet().isUndefined()).isTrue();
    assertThat(result.facts().timeZone()).isNull();
    assertThat(result.context().providerPublishedAt()).isNull();
  }

  @Test
  @DisplayName("Preserves explicit withdrawals separately from omission")
  void preservesExplicitNull() {
    // Given
    MatchDetailObservationInternalRequest request =
        request(
            new MatchFactsInternalRequest()
                ._localDate(null)
                .result(null)
                .sets(null)
                .informationSheet(null));

    // When
    MatchObservation result = mapper.toObservation(MATCH, request);

    // Then
    assertThat(result.facts().localDate()).isEqualTo(JsonNullable.of(null));
    assertThat(result.facts().result()).isEqualTo(JsonNullable.of(null));
    assertThat(result.facts().sets()).isEqualTo(JsonNullable.of(null));
    assertThat(result.facts().informationSheet()).isEqualTo(JsonNullable.of(null));
  }

  @Test
  @DisplayName("Maps supplied facts with their original identity and attribution")
  void mapsSuppliedFacts() {
    // Given
    MatchDetailObservationInternalRequest request =
        request(
            new MatchFactsInternalRequest()
                ._localDate(LocalDate.of(2026, 10, 18))
                ._localTime("19:30")
                .timeZone("Europe/Paris")
                .result(
                    new MatchResultInternalRequest(ResultStateEnum.FINAL).homeSets(3).awaySets(1))
                .sets(List.of(new MatchSetScoreInternalRequest(25, 20)))
                .venueName("Synthetic venue")
                .venueAddress("Synthetic address")
                .referees(List.of("Synthetic referee"))
                .professionalStreamUrl(URI.create("https://example.invalid/stream"))
                .informationSheet(new InformationSheetInternalRequest("2026/2027", "LIG", "M42"))
                .scoresheetUrl(URI.create("https://example.invalid/scoresheet.pdf"))
                .statisticsUrl(URI.create("https://example.invalid/statistics.pdf")));
    request.getContext().observedAt(OffsetDateTime.parse("2026-10-18T20:00:00+02:00"));
    request.getContext().providerPublishedAt(OffsetDateTime.parse("2026-10-18T18:00:00+01:00"));

    // When
    MatchObservation result = mapper.toObservation(MATCH, request);

    // Then
    assertThat(result.matchId()).isEqualTo(MATCH);
    assertThat(result.context().cycleId()).isEqualTo(request.getContext().getCycleId());
    assertThat(result.context().readOrdinal()).isEqualTo(7L);
    assertThat(result.context().observedAt()).isEqualTo(Instant.parse("2026-10-18T18:00:00Z"));
    assertThat(result.context().providerPublishedAt())
        .isEqualTo(Instant.parse("2026-10-18T17:00:00Z"));
    assertThat(result.facts().localDate().get()).isEqualTo(LocalDate.of(2026, 10, 18));
    assertThat(result.facts().localTime().get()).isEqualTo("19:30");
    assertThat(result.facts().timeZone()).isEqualTo("Europe/Paris");
    assertThat(result.facts().result().get())
        .isEqualTo(new MatchObservation.Result(ResultStateEnum.FINAL, 3, 1, null));
    assertThat(result.facts().sets().get()).containsExactly(new MatchFacts.SetScore(25, 20));
    assertThat(result.facts().venueName().get()).isEqualTo("Synthetic venue");
    assertThat(result.facts().venueAddress().get()).isEqualTo("Synthetic address");
    assertThat(result.facts().referees().get()).containsExactly("Synthetic referee");
    assertThat(result.facts().professionalStreamUrl().get())
        .isEqualTo(URI.create("https://example.invalid/stream"));
    assertThat(result.facts().informationSheet().get())
        .isEqualTo(new MatchObservation.InformationSheet("2026/2027", "LIG", "M42"));
    assertThat(result.facts().scoresheetUrl().get())
        .isEqualTo(URI.create("https://example.invalid/scoresheet.pdf"));
    assertThat(result.facts().statisticsUrl().get())
        .isEqualTo(URI.create("https://example.invalid/statistics.pdf"));
  }

  @Test
  @DisplayName("Keeps explicit empty collections distinct from withdrawal")
  void preservesEmptyCollections() {
    // Given
    MatchDetailObservationInternalRequest request =
        request(new MatchFactsInternalRequest().sets(List.of()).referees(List.of()));

    // When
    MatchObservation result = mapper.toObservation(MATCH, request);

    // Then
    assertThat(result.facts().sets().get()).isEmpty();
    assertThat(result.facts().referees().get()).isEmpty();
  }

  @Test
  @DisplayName("Detaches application collections from mutable generated input")
  void detachesInputCollections() {
    // Given
    MatchFactsInternalRequest facts =
        new MatchFactsInternalRequest()
            .sets(new ArrayList<>(List.of(new MatchSetScoreInternalRequest(25, 20))))
            .referees(new ArrayList<>(List.of("Synthetic referee")));
    MatchObservation observation = mapper.toObservation(MATCH, request(facts));

    // When
    facts.getSets().get().getFirst().home(0);
    facts.getSets().get().clear();
    facts.getReferees().get().clear();

    // Then
    assertThat(observation.facts().sets().get()).containsExactly(new MatchFacts.SetScore(25, 20));
    assertThat(observation.facts().referees().get()).containsExactly("Synthetic referee");
  }

  @Test
  @DisplayName("Maps multipart offsets without inventing a provider publication time")
  void mapsMultipartAttribution() {
    // Given
    UUID cycle = UUID.fromString("00000000-0000-4000-8000-000000000002");
    OffsetDateTime observed = OffsetDateTime.parse("2026-10-25T02:30:00+02:00");

    // When
    MatchObservation.Context context = mapper.toContext(cycle, 4L, observed, null);

    // Then
    assertThat(context.observedAt()).isEqualTo(Instant.parse("2026-10-25T00:30:00Z"));
    assertThat(context.providerPublishedAt()).isNull();
    assertThat(context.cycleId()).isEqualTo(cycle);
    assertThat(context.readOrdinal()).isEqualTo(4L);
  }

  /**
   * Supplies required attribution while leaving the scenario's independent facts visible.
   *
   * @param facts scenario-owned proposals
   * @return a generated request with synthetic, fixed collection context
   */
  private static MatchDetailObservationInternalRequest request(MatchFactsInternalRequest facts) {
    return new MatchDetailObservationInternalRequest(
        new ObservationContextInternalRequest(
            UUID.fromString("00000000-0000-4000-8000-000000000002"),
            7L,
            OffsetDateTime.parse("2026-10-18T18:00:00Z")),
        facts);
  }
}
