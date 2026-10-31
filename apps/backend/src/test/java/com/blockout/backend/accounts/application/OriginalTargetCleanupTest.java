package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Controlled provider boundaries qualify independent attempts, never actual provider erasure. */
@DisplayName("Original target cleanup")
class OriginalTargetCleanupTest {
  @Test
  @DisplayName("Attempts each distinct original reference despite another provider failing")
  void continuesIndependentAttempts() {
    // Given
    UUID original = UUID.fromString("00000000-0000-4000-8000-000000000280");
    List<String> calls = new ArrayList<>();
    OriginalTargetCleanup cleanup =
        new OriginalTargetCleanup(
            (issuer, subject) -> {
              calls.add(subject);
              throw new IllegalStateException("private-provider-payload");
            },
            customer -> {
              calls.add(customer);
              return Outcome.QUEUED;
            },
            "preproduction");

    // When
    cleanup.clean(
        new OriginalAccountTargets(
            original,
            "https://identity.example.invalid/",
            "auth0|original",
            List.of(original.toString(), "historical-established", "historical-established")));

    // Then
    assertThat(calls)
        .containsExactly("auth0|original", original.toString(), "historical-established");
  }

  @Test
  @DisplayName("Missing targets produce no guessed provider call")
  void skipsUnknownTargets() {
    // Given
    List<String> calls = new ArrayList<>();
    OriginalTargetCleanup cleanup =
        new OriginalTargetCleanup(
            (issuer, subject) -> {
              calls.add(subject);
              return Outcome.REMOVED;
            },
            customer -> {
              calls.add(customer);
              return Outcome.QUEUED;
            },
            "disabled");

    // When
    cleanup.clean(
        new OriginalAccountTargets(
            UUID.fromString("00000000-0000-4000-8000-000000000280"),
            "https://identity.example.invalid/",
            "",
            List.of()));

    // Then
    assertThat(calls).isEmpty();
  }
}
