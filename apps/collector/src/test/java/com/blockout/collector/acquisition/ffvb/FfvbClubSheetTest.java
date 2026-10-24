package com.blockout.collector.acquisition.ffvb;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.nio.charset.Charset;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.apache.hc.core5.http.NameValuePair;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

/** Synthetic sheets contain demonstration contacts only; live compatibility belongs to T058. */
@DisplayName("Covered FFVB club sheets")
class FfvbClubSheetTest {
  private static final URI FORM =
      URI.create("https://www.ffvbbeach.org/ffvbapp/adressier/recherche.php");

  @ParameterizedTest
  @ValueSource(
      strings = {
        "<form method=post action='rech_aff_club.php'><input name=id_club disabled></form>",
        "<form method=post action='rech_aff_club.php'><input name=id_club><input name=id_club></form>",
        "<form method=get action='rech_aff_club.php'><input name=id_club></form>"
      })
  @DisplayName("An unusable identity control cannot turn a covered lookup into a directory search")
  void rejectsUnusableLookup(String form) {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(FORM))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderHttpClient.Response(bytes(form), FORM, true)));

    // When / Then
    assertThatThrownBy(() -> new FfvbClubSheets(http).read("000042"))
        .isInstanceOf(FfvbAcquisitionException.class);
    verify(http, never()).post(any(), any());
  }

  @Test
  @DisplayName("Recognizes published field labels with a trailing colon")
  void recognizesTrailingColonLabels() {
    // Given
    byte[] html = bytes(sheet("000042").replace("</td><td>", " : </td><td>"));

    // When
    SportingObservation.Club club = FfvbClubSheets.parse(html, "000042");

    // Then
    assertThat(club.sourceName()).isEqualTo("Synthetic volley");
    assertThat(club.city().get()).isEqualTo("Testville");
    assertThat(club.postalCode().get()).isEqualTo("00123");
  }

  @Test
  @DisplayName("Uses the published POST action with the exact encountered reference")
  void followsPublishedForm() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(FORM))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderHttpClient.Response(
                    bytes(
                        "<form method=POST action='current_club.php'><input name=id_club><input name=scope value=current type=hidden></form>"),
                    FORM,
                    true)));
    when(http.post(any(), any()))
        .thenReturn(CompletableFuture.completedFuture(bytes(sheet("000042"))));
    FfvbClubSheets reader = new FfvbClubSheets(http);

    // When
    SportingObservation.Club result = reader.read("000042");

    // Then
    ArgumentCaptor<List<NameValuePair>> fields = ArgumentCaptor.captor();
    verify(http).post(eq(FORM.resolve("current_club.php")), fields.capture());
    assertThat(fields.getValue())
        .anySatisfy(
            field -> {
              assertThat(field.getName()).isEqualTo("id_club");
              assertThat(field.getValue()).isEqualTo("000042");
            });
    assertThat(result.sourceName()).isEqualTo("Synthetic volley");
  }

  @Test
  @DisplayName("Preserves absent fields, explicit emptiness and malformed proposals independently")
  void preservesFieldPresence() {
    // Given
    byte[] sheet =
        bytes(
            sheet("000042")
                + "<table><tr><td>Email</td><td>invalid-email</td></tr><tr><td>Site web</td><td></td></tr><tr><td>Unrecognized</td><td>ignored</td></tr></table>");

    // When
    SportingObservation.Club club = FfvbClubSheets.parse(sheet, "000042");

    // Then
    assertThat(club.email().get()).isEqualTo("invalid-email");
    assertThat(club.website().isPresent()).isTrue();
    assertThat(club.website().get()).isNull();
    assertThat(club.phone().isPresent()).isFalse();
    assertThat(club.postalCode().get()).isEqualTo("00123");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "<html>Service unavailable</html>",
        "<table><tr><td>Code club</td><td>42</td></tr><tr><td>Nom du club</td><td>Other</td></tr></table>"
      })
  @DisplayName("Rejects unqualified or foreign sheets without producing a withdrawal")
  void rejectsUnqualifiedSheet(String html) {
    // Given / When / Then
    assertThatThrownBy(() -> FfvbClubSheets.parse(bytes(html), "000042"))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  /**
   * Creates a minimal attributable synthetic sheet, without a directory or source logo.
   *
   * @param reference exact identity published in this fixture
   * @return demonstration sheet with explicit leading-zero postal context
   */
  private static String sheet(String reference) {
    return "<table><tr><td>Code club</td><td>"
        + reference
        + "</td></tr><tr><td>Nom du club</td><td>Synthetic volley</td></tr><tr><td>Ville</td><td>Testville</td></tr><tr><td>Code postal</td><td>00123</td></tr></table>";
  }

  /**
   * Encodes synthetic HTML using the provider's documented page encoding.
   *
   * @param html demonstration document
   * @return Windows-1252 bytes
   */
  private static byte[] bytes(String html) {
    return html.getBytes(Charset.forName("windows-1252"));
  }
}
