package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic published postback state exercises the provider-shape boundary without network I/O. */
@DisplayName("LNV document form state qualification")
class LnvDocumentReferencesTest {
  @ParameterizedTest
  @ValueSource(strings = {"[]", "null", "true", "42", "\"opaque\""})
  @DisplayName("Rejects non-object client state as an acquisition refusal")
  void rejectsNonObjectClientState(String state) {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        """
        <form method=post action="MatchStatistics.aspx?mID=990&ID=901">
        <div id=Tabs><li class=rtsLI>Scoresheet</li></div>
        <input type=hidden id=State name=State value='%s'>
        </form><script>
        $create(Telerik.Web.UI.RadTabStrip, {"_postBackReference":"__doPostBack('tabs','arguments')","clientStateFieldID":"State","tabData":[{}]}, null, null, $get("Tabs"));
        </script>
        """
            .formatted(state);
    LnvDocumentReferences references = new LnvDocumentReferences();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> references.form(html.getBytes(StandardCharsets.UTF_8), page, "Scoresheet");

    // Then
    assertThatThrownBy(read).isInstanceOf(LnvAcquisitionException.class);
  }
}
