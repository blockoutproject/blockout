package com.blockout.backend.sports.reference.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Protects the exact canonical-name preparation shared with the existing FFVB scraper. */
class TeamNameTest {
  @Test
  void retainsAccentsAndInternalWhitespace() {
    assertThat(TeamName.normalize("  Équipe  D’AS.-1  ")).isEqualTo("équipe  d'as 1");
  }

  @Test
  void treatsARealNewNameAsADifferentKey() {
    assertThat(TeamName.normalize("Club A")).isNotEqualTo(TeamName.normalize("Club B"));
  }
}
