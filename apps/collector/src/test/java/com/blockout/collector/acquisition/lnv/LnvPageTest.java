package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Native clock syntax and bounded malformed-input handling without provider or HTTP dependencies.
 */
@DisplayName("LNV rendered date and clock separation")
class LnvPageTest {
  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu");

  @ParameterizedTest
  @ValueSource(strings = {" - ", "\t-\t", " \r\n-\f ", "     -     "})
  @DisplayName("ASCII whitespace separates a qualified UTC clock before Paris conversion")
  void readsWhitespaceSeparatedClock(String separator) {
    // Given
    String rendered = "\u2003 17/10/2026" + separator + "23:30 \u2003";

    // When
    SportingObservation.Facts facts = LnvPage.time(rendered, DATE);

    // Then
    assertThat(facts.localDate().get()).isEqualTo(LocalDate.of(2026, 10, 18));
    assertThat(facts.localTime().get()).isEqualTo("01:30");
    assertThat(facts.timeZone()).isEqualTo("Europe/Paris");
  }

  @ParameterizedTest
  @ValueSource(strings = {"17/10/2026", "17/10/2026 - --:--"})
  @DisplayName("A date without a published clock stays date-only")
  void preservesDateOnly(String rendered) {
    // Given
    LocalDate expectedDate = LocalDate.of(2026, 10, 17);

    // When
    SportingObservation.Facts facts = LnvPage.time(rendered, DATE);

    // Then
    assertThat(facts.localDate().get()).isEqualTo(expectedDate);
    assertThat(facts.localTime().get()).isNull();
    assertThat(facts.timeZone()).isNull();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "17/10/2026-23:30",
        "17/10/2026 -23:30",
        "17/10/2026- 23:30",
        "17/10/2026\u00a0-\u00a023:30",
        "17/10/2026\u2003 - 23:30",
        "17/10/2026 - \u200323:30",
        "17/10/2026 - 23:30 - 23:31",
        "17/10/2026 - 24:00"
      })
  @DisplayName("Malformed separators and clocks are refused without accepting wider Unicode syntax")
  void rejectsMalformedClock(String rendered) {
    // Given
    DateTimeFormatter dateFormat = DATE;

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable parse =
        () -> LnvPage.time(rendered, dateFormat);

    // Then
    assertThatThrownBy(parse).isInstanceOf(LnvAcquisitionException.class);
  }

  @Test
  @Timeout(3)
  @DisplayName("A long whitespace run without a separator is refused without repeated rescanning")
  void rejectsLongMalformedClock() {
    // Given: bounded provider input can contain a long run that is not followed by the delimiter.
    String rendered = "17/10/2026" + " ".repeat(150_000) + "invalid";

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
        () -> LnvPage.time(rendered, DATE);

    // Then
    assertThatThrownBy(action).isInstanceOf(LnvAcquisitionException.class);
  }
}
