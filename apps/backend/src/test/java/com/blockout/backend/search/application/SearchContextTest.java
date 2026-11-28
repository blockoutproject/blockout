package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Protects the exact Unicode text boundary shared with discovery's mobile cache selection. */
@DisplayName("Discovery selection normalization")
class SearchContextTest {
  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" ", "\t\r\n", "\u0085\u00a0\u2007\u202f", "          "})
  @DisplayName("Treats only Unicode whitespace as an empty example selection")
  void recognizesWhitespaceOnlySelection(String text) {
    // Given
    SearchContext.Resource resource = SearchContext.Resource.TEAM;

    // When
    SearchContext context = new SearchContext(resource, text, null, null, null, null, false);

    // Then
    assertThat(context.text()).isEmpty();
    assertThat(context.examples()).isTrue();
  }

  @Test
  @DisplayName("Folds whitespace runs and case without retaining edge spaces")
  void normalizesText() {
    // Given
    String text = "\u00a0 ÉTOILE\t\n  VOLLEY \u0085";

    // When
    SearchContext context =
        new SearchContext(SearchContext.Resource.TEAM, text, null, null, null, null, false);

    // Then
    assertThat(context.text()).isEqualTo("étoile volley");
  }

  @ParameterizedTest
  @ValueSource(strings = {"\u0000", "\u001c", "\u001d", "\u001e", "\u001f", "\ufeff"})
  @DisplayName("Preserves non-whitespace control and format characters after edge folding")
  void preservesTextualCharacters(String character) {
    // Given
    String text = " \t" + character + " \n";

    // When
    SearchContext context =
        new SearchContext(SearchContext.Resource.TEAM, text, null, null, null, null, false);

    // Then
    assertThat(context.text()).isEqualTo(character);
    assertThat(context.examples()).isFalse();
  }
}
