package com.blockout.backend.logging;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.logging.StandardStackTracePrinter;

/**
 * Verifies diagnostic call sites survive while exception messages and suppressed failures stay
 * private.
 */
class PrivateStackTracePrinterTest {
  @Test
  void retainsCallSitesWithoutPrivateMessages() {
    var failure =
        new IllegalStateException(
            "private-response", new IllegalArgumentException("private-token"));
    failure.addSuppressed(new RuntimeException("private-database-row"));
    var printer = new PrivateStackTracePrinter(StandardStackTracePrinter.rootLast());

    String trace = printer.printStackTraceToString(failure);

    assertThat(trace)
        .contains("java.lang.IllegalStateException", "retainsCallSitesWithoutPrivateMessages")
        .doesNotContain("private-", "Suppressed");
  }
}
