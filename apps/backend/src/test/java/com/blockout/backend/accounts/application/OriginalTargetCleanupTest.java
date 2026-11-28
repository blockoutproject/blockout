package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import com.blockout.backend.shared.image.ImageObjects;
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
    ImageObjects images = mock(ImageObjects.class);
    String photoKey = "images/00000000-0000-4000-8000-000000000001";
    when(images.bucket()).thenReturn("preproduction-image-fixtures");
    doThrow(new IllegalStateException("private-provider-payload")).when(images).delete(photoKey);
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
            images);

    // When
    cleanup.clean(
        new OriginalAccountTargets(
            original,
            "https://identity.example.invalid/",
            "auth0|original",
            List.of(original.toString(), "historical-established", "historical-established"),
            photoKey));

    // Then
    verify(images).delete(photoKey);
    assertThat(calls)
        .containsExactlyInAnyOrder("auth0|original", original.toString(), "historical-established");
  }

  @Test
  @DisplayName("Missing targets produce no guessed provider call")
  void skipsUnknownTargets() {
    // Given
    List<String> calls = new ArrayList<>();
    ImageObjects images = mock(ImageObjects.class);
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
            images);

    // When
    cleanup.clean(
        new OriginalAccountTargets(
            UUID.fromString("00000000-0000-4000-8000-000000000280"),
            "https://identity.example.invalid/",
            "",
            List.of(),
            null));

    // Then
    assertThat(calls).isEmpty();
    verifyNoInteractions(images);
  }
}
