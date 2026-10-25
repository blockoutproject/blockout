package com.blockout.backend.sporting.application.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Public projection values own immutable copies independently from reads and index adapters. */
@DisplayName("Detached sporting public values")
class SportingPublicInputTest {
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000186");

  @Test
  @DisplayName("Public projection values detach aliases and participations from mutable inputs")
  void freezesPublicValues() {
    // Given
    Set<SportingPublicInput.Alias> aliases = new HashSet<>();
    List<UUID> pools = new ArrayList<>(List.of(MATCH));
    SportingPublicInput input =
        new SportingPublicInput(
            MATCH,
            Kind.TEAM,
            null,
            "Source",
            "Effective",
            "Short",
            aliases,
            null,
            null,
            Set.of(),
            null,
            null,
            null,
            pools);

    // When
    aliases.add(new SportingPublicInput.Alias(MATCH, "ORG", "COMP", "Alias"));
    pools.clear();

    // Then
    assertThat(input.aliases()).isEmpty();
    assertThat(input.poolIds()).containsExactly(MATCH);
    assertThatThrownBy(() -> input.poolIds().clear())
        .isInstanceOf(UnsupportedOperationException.class);
  }
}
