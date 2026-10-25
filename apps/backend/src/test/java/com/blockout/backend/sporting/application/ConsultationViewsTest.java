package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.sporting.application.ConsultationViews.Division;
import com.blockout.backend.sporting.application.ConsultationViews.StreamLink;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Protects public application value invariants independently of their generated JSON transport. */
@DisplayName("Consultation application values")
class ConsultationViewsTest {
  @Test
  @DisplayName("Requires a URL when carrying a contributed stream version")
  void rejectsOrphanVersion() {
    // Given
    UUID version = UUID.fromString("00000000-0000-4000-8000-000000000001");

    // When
    ThrowingCallable create = () -> new StreamLink(null, version);

    // Then
    assertThatThrownBy(create).isInstanceOf(NullPointerException.class);
  }

  @Test
  @DisplayName("Detaches gradient colors from projection-owned mutable inputs")
  void detachesGradient() {
    // Given
    List<String> colors = new ArrayList<>(List.of("#112233", "#223344", "#334455"));
    Division division =
        new Division(
            UUID.fromString("00000000-0000-4000-8000-000000000001"),
            "Division",
            null,
            "#112233",
            colors);

    // When
    colors.clear();

    // Then
    assertThat(division.gradient()).containsExactly("#112233", "#223344", "#334455");
  }

  @Test
  @DisplayName("Prevents consumers from mutating the retained gradient")
  void protectsGradient() {
    // Given
    Division division =
        new Division(
            UUID.fromString("00000000-0000-4000-8000-000000000001"),
            "Division",
            null,
            "#112233",
            List.of("#112233", "#223344", "#334455"));

    // When
    ThrowingCallable mutate = () -> division.gradient().clear();

    // Then
    assertThatThrownBy(mutate).isInstanceOf(UnsupportedOperationException.class);
  }
}
