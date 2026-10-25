package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletionException;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/**
 * Real lifecycle-issued capability with controlled provider/HTTP owners; no live provider access.
 */
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Collection passage operational categories")
class CollectionOperationalEvidenceTest {
  private static final Instant NOW = Instant.parse("2026-10-25T00:00:00Z");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000202");
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000203");
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private final SportingBackend sporting = mock(SportingBackend.class);
  private final MunicipalGeocoder geocoder = mock(MunicipalGeocoder.class);
  private final ClubSheets clubs = mock(ClubSheets.class);
  private final CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
  private final CollectPassage passage =
      new CollectPassage(
          backend,
          sporting,
          mock(FfvbAcquisition.class),
          mock(LnvAcquisition.class),
          clubs,
          geocoder,
          mock(DiscoverSeasonSources.class),
          lifecycle,
          Clock.fixed(NOW, ZoneOffset.UTC));

  @ParameterizedTest
  @MethodSource("acquisitionFailures")
  @DisplayName("Reports structural and technical seasonless failures with fixed categories")
  void categorizesAcquisitionFailure(
      RuntimeException failure, String category, CapturedOutput output) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = admitted();
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .scopeId(CLUB)
            .clubId(CLUB)
            .kind(CollectionTargetKindEnum.GEOCODING)
            .municipality("Synthetic municipality")
            .localityRevision("9")
            .build();
    when(backend.targets(cycle.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    when(geocoder.read("Synthetic municipality", null, "9")).thenThrow(failure);

    // When
    boolean completed = passage.execute(cycle);

    // Then
    ArgumentCaptor<CollectionBackend.Result> result =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend).record(eq(cycle.getCycle().id()), result.capture());
    assertThat(result.getValue().reasonType())
        .isEqualTo(URI.create("urn:blockout:acquisition:" + category));
    assertThat(result.getValue().outcome()).isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(result.getValue().reason()).doesNotContain("private-provider-body");
    assertThat(result.getValue().scopeId()).isEqualTo(CLUB);
    assertThat(completed).isTrue();
    verifyNoInteractions(sporting);
    verify(geocoder).read("Synthetic municipality", null, "9");
    assertThat(output.getAll()).doesNotContain("private-provider-body");
  }

  @ParameterizedTest
  @EnumSource(
      value = GeocodingOutcomeEnum.class,
      names = {"EMPTY", "AMBIGUOUS"})
  @DisplayName("Valid unresolved municipality acquisition stays successful when integration fails")
  void separatesNormalAcquisition(GeocodingOutcomeEnum outcome) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = admitted();
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .scopeId(CLUB)
            .clubId(CLUB)
            .kind(CollectionTargetKindEnum.GEOCODING)
            .municipality("Synthetic municipality")
            .localityRevision("9")
            .build();
    SportingObservation.Locality point = new SportingObservation.Locality("9", outcome, null, null);
    when(backend.targets(cycle.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    when(geocoder.read("Synthetic municipality", null, "9")).thenReturn(point);
    when(sporting.locality(eq(CLUB), any(), eq(point)))
        .thenReturn(
            new SportingObservation.Outcome(
                null, ObservationOutcomeEnum.REJECTED, CLUB, null, null, null));

    // When
    passage.execute(cycle);

    // Then
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(2)).record(eq(cycle.getCycle().id()), results.capture());
    assertThat(results.getAllValues().getFirst().phase())
        .isEqualTo(CollectionPhaseEnum.ACQUISITION);
    assertThat(results.getAllValues().getFirst().outcome())
        .isEqualTo(CollectionOutcomeEnum.SUCCESS);
    assertThat(results.getAllValues().getLast().phase()).isEqualTo(CollectionPhaseEnum.INTEGRATION);
    assertThat(results.getAllValues().getLast().outcome()).isEqualTo(CollectionOutcomeEnum.FAILED);
    verify(sporting).locality(eq(CLUB), any(), eq(point));
  }

  @Test
  @DisplayName("A wrapped FFVB HTTP failure remains a transport problem")
  void reportsWrappedTransportFailure(CapturedOutput output) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = admitted();
    URI source =
        URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?calend=COMPLET");
    com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient http =
        mock(com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient.class);
    FfvbAcquisition reader =
        new com.blockout.collector.acquisition.ffvb.FfvbObservationReader(
            http,
            new com.blockout.collector.acquisition.ffvb.FfvbCalendarParser(),
            new com.blockout.collector.acquisition.ffvb.FfvbStandingsParser(),
            Clock.fixed(NOW, ZoneOffset.UTC));
    CollectPassage actual =
        new CollectPassage(
            backend,
            sporting,
            reader,
            mock(LnvAcquisition.class),
            clubs,
            geocoder,
            mock(DiscoverSeasonSources.class),
            lifecycle,
            Clock.fixed(NOW, ZoneOffset.UTC));
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .scopeId(CLUB)
            .poolId(CLUB)
            .provider(com.blockout.collector.generated.ingestion.model.CollectionProviderEnum.FFVB)
            .kind(CollectionTargetKindEnum.CALENDAR)
            .url(source)
            .build();
    when(backend.targets(cycle.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    when(http.page(source))
        .thenReturn(
            java.util.concurrent.CompletableFuture.failedFuture(
                new org.apache.hc.client5.http.HttpResponseException(
                    503, "private-provider-body")));

    // When
    actual.execute(cycle);

    // Then
    ArgumentCaptor<CollectionBackend.Result> result =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend).record(eq(cycle.getCycle().id()), result.capture());
    assertThat(result.getValue().reasonType())
        .isEqualTo(URI.create("urn:blockout:acquisition:technical"));
    assertThat(result.getValue().reason()).isEqualTo("Provider HTTP 503");
    verify(http).page(source);
    verifyNoInteractions(sporting);
    assertThat(output.getAll()).doesNotContain("private-provider-body");
  }

  /**
   * Supplies actual failure types without depending on raw exception messages for classification.
   *
   * @return independently created exceptions and their fixed expected acquisition category
   */
  private static Stream<Arguments> acquisitionFailures() {
    return Stream.of(
        Arguments.of(new IllegalArgumentException("private-provider-body"), "structure"),
        Arguments.of(new IllegalStateException("private-provider-body"), "technical"),
        Arguments.of(
            new CompletionException(new java.io.IOException("private-provider-body")),
            "technical"));
  }

  /**
   * Establishes real startup/admission decisions and an exact normal terminal acknowledgement.
   *
   * @return lifecycle-issued control capability without a mocked record or enum
   */
  private CollectorLifecycle.AdmittedCycle admitted() {
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.StartCycle start = call.getArgument(0);
              return new CollectionBackend.Cycle(
                  start.cycleId(),
                  start.incarnationId(),
                  CONTROL,
                  null,
                  1,
                  CollectionModeEnum.PERIODIC,
                  CollectionCycleStateEnum.RUNNING,
                  false,
                  null);
            });
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    when(backend.complete(cycle.getCycle().id(), NOW))
        .thenReturn(
            new CollectionBackend.Cycle(
                cycle.getCycle().id(),
                lifecycle.getIncarnationId(),
                CONTROL,
                null,
                1,
                CollectionModeEnum.PERIODIC,
                CollectionCycleStateEnum.COMPLETED,
                false,
                NOW));
    return cycle;
  }
}
