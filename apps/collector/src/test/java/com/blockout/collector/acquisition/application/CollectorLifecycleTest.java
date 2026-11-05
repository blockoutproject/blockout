package com.blockout.collector.acquisition.application;

import static com.blockout.collector.acquisition.application.CollectionCycleFixture.completed;
import static com.blockout.collector.acquisition.application.CollectionCycleFixture.runningCandidate;
import static com.blockout.collector.acquisition.application.CollectionCycleFixture.runningControl;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Proves one-attempt terminal effects using real lifecycle-issued capabilities and a controlled
 * backend.
 */
@DisplayName("Collector lifecycle completion")
class CollectorLifecycleTest {
  private static final Instant NOW = Instant.parse("2026-10-19T12:00:00Z");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private final CollectorLifecycle lifecycle = new CollectorLifecycle(backend);

  @Test
  @DisplayName("A lost completion acknowledgement propagates without a confirmation read")
  void propagatesCompletionFailure() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningControl(call.getArgument(0)));
    CollectorLifecycle.AdmittedCycle admitted = lifecycle.admit(CONTROL, null, 0, null);
    CollectionBackendFailure failure = uncertain();
    when(backend.complete(admitted.getCycle().id(), NOW)).thenThrow(failure);

    // When / Then
    assertThatThrownBy(() -> lifecycle.complete(admitted, NOW)).isSameAs(failure);
    verify(backend).complete(admitted.getCycle().id(), NOW);
  }

  @Test
  @DisplayName("Sends the actual completion timestamp once without an acknowledgement protocol")
  void completesOnce() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningControl(call.getArgument(0)));
    CollectorLifecycle.AdmittedCycle admitted = lifecycle.admit(CONTROL, null, 0, null);
    Instant actualEnd = NOW.plusNanos(123_456_789);
    when(backend.complete(admitted.getCycle().id(), actualEnd))
        .thenReturn(completed(admitted.getCycle(), actualEnd));

    // When
    lifecycle.complete(admitted, actualEnd);

    // Then
    verify(backend).complete(admitted.getCycle().id(), actualEnd);
  }

  @Test
  @DisplayName("A lost validation result propagates without substituting control completion")
  void propagatesCandidateResultFailure() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    CollectionBackend.Candidate candidate =
        new CollectionBackend.Candidate(
            URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901"),
            "2026/2027",
            CollectionProviderEnum.LNV,
            "901");
    when(backend.admit(any())).thenAnswer(call -> runningCandidate(call.getArgument(0), candidate));
    CollectorLifecycle.AdmittedCycle admitted = lifecycle.admit(null, CONTROL, 0, null);
    CollectionBackend.Validation result =
        new CollectionBackend.Validation(
            admitted.getCycle().id(),
            SourceValidationStateEnum.QUALIFIED,
            NOW,
            "2026/2027",
            null,
            null);
    CollectionBackendFailure failure = uncertain();
    doThrow(failure).when(backend).validate(CONTROL, result);

    // When / Then
    assertThatThrownBy(() -> lifecycle.validate(admitted, result)).isSameAs(failure);
    verify(backend).validate(CONTROL, result);
    verify(backend, never()).complete(any(), any());
  }

  /**
   * Models response loss without a network side effect.
   *
   * @return a response-loss classification without a real network side effect
   */
  private CollectionBackendFailure uncertain() {
    return new CollectionBackendFailure(
        CollectionBackendFailure.Kind.UNCONFIRMED, new IOException("Synthetic response loss"));
  }
}
