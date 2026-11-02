package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Synthetic native playoff containers distinguish an absent table from broken regular standings.
 */
@DisplayName("LNV standings publication")
class LnvStandingsParserTest {
  private static final URI PAGE =
      URI.create("https://lnv-web.dataproject.com/CompetitionStandings.aspx?ID=901&PID=902");

  @Test
  @DisplayName("Nested team presentation tables do not become official standings rows")
  void readsOnlyOfficialRows() {
    // Given
    byte[] html =
        """
        <div id='Content_Main_903'><table class='rgMasterTable'>
          <thead><tr><th>Equipe</th><th>Points</th></tr></thead>
          <tbody>
            <tr><td><table><tbody><tr><td><span id='TeamName'>Alpha</span>
              <input id='HF_TeamID' value='001'></td><td>Logo</td></tr></tbody></table></td><td>0</td></tr>
            <tr><td><span id='TeamName'>Beta</span><input id='HF_TeamID' value='002'></td><td>3</td></tr>
          </tbody>
        </table></div>
        """
            .getBytes(StandardCharsets.UTF_8);

    // When
    SportingObservation.Standings standings = new LnvStandingsParser().parse(html, PAGE, "903");

    // Then
    assertThat(standings.publicationState()).isEqualTo(StandingsPublicationStateEnum.PUBLISHED);
    assertThat(standings.rows())
        .extracting(SportingObservation.Standing::sourceName)
        .containsExactly("Alpha", "Beta");
    assertThat(standings.rows().getFirst().statistics()).containsEntry("Points", "0");
  }

  @Test
  @DisplayName("A contextual playoff bracket publishes no tabular standings")
  void readsAbsentPlayoffTable() {
    // Given
    byte[] html =
        ("<div id='Content_Main_903' class='rmpView'>"
                + "<span id='Content_Main_903_userControl_lbl_title'>Play-Offs Standing</span>"
                + "<div id='Content_Main_903_userControl_RPL_POGrid'><div>Finale</div></div>"
                + "<input id='Content_Main_903_userControl_HiddenChampionship' value='903'>"
                + "</div>")
            .getBytes(StandardCharsets.UTF_8);

    // When
    SportingObservation.Standings standings = new LnvStandingsParser().parse(html, PAGE, "903");

    // Then
    assertThat(standings.publicationState()).isEqualTo(StandingsPublicationStateEnum.NOT_PUBLISHED);
    assertThat(standings.columns()).isEmpty();
    assertThat(standings.rows()).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "",
        "<div id='Content_Main_903_userControl_RPL_POGrid'></div>",
        "<div id='Content_Main_903_userControl_RPL_POGrid'></div>"
            + "<input id='Content_Main_903_userControl_HiddenChampionship' value='904'>"
      })
  @DisplayName("Missing or contradictory playoff context cannot establish table absence")
  void rejectsUnqualifiedAbsence(String context) {
    // Given
    byte[] html =
        ("<div id='Content_Main_903'><span id='x_lbl_title'>Standing</span>" + context + "</div>")
            .getBytes(StandardCharsets.UTF_8);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable parse =
        () -> new LnvStandingsParser().parse(html, PAGE, "903");

    // Then
    assertThatThrownBy(parse).isInstanceOf(LnvAcquisitionException.class);
  }
}
