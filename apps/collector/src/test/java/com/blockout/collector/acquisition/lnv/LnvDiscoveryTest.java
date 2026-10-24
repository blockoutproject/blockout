package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic pages exercise native HTML URL resolution without contacting the provider. */
@DisplayName("LNV phase navigation")
class LnvDiscoveryTest {
  @ParameterizedTest
  @ValueSource(
      strings = {
        "<a href='?ID=901&PID=902'>Regular</a>",
        "<base href='https://lnv-web.dataproject.com/'><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"
      })
  @DisplayName("Phase links resolve against their HTML context")
  void resolvesPublishedPhaseLinks(String html) {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901");

    // When
    List<URI> links =
        new LnvDiscovery().phaseLinks(html.getBytes(StandardCharsets.UTF_8), page, "901");

    // Then
    assertThat(links)
        .containsExactly(
            URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902"));
  }

  @Test
  @DisplayName("A foreign document base cannot qualify a phase link")
  void rejectsForeignDocumentBase() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901");
    String html =
        "<base href='https://foreign.example/'><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>";

    // When / Then
    assertThatThrownBy(
            () -> new LnvDiscovery().phaseLinks(html.getBytes(StandardCharsets.UTF_8), page, "901"))
        .isInstanceOf(LnvAcquisitionException.class);
  }
}
