package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

/** Protects bounded processing of malformed provider clock input. */
@DisplayName("LNV malformed clock input")
class LnvPageTest {
  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu");

  @Test
  @Timeout(3)
  @DisplayName("A long whitespace run without a separator is refused without repeated rescanning")
  void rejectsLongMalformedClock() {
    // Given: bounded provider input can contain a long run that is not followed by the delimiter.
    String rendered = "17/10/2026" + " ".repeat(150_000) + "invalid";

    // When / Then
    assertThatThrownBy(() -> LnvPage.time(rendered, DATE))
        .isInstanceOf(LnvAcquisitionException.class);
  }
}
