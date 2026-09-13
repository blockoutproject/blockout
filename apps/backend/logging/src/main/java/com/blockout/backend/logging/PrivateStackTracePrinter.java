package com.blockout.backend.logging;

import java.io.IOException;
import org.springframework.boot.logging.StackTracePrinter;
import org.springframework.boot.logging.StandardStackTracePrinter;

/** Keeps exception types and frames while Spring's ECS configuration excludes error messages. */
public final class PrivateStackTracePrinter implements StackTracePrinter {
  private final StandardStackTracePrinter printer;

  /**
   * Configures Boot formatting to keep exception types and frames without private messages.
   *
   * @param printer standard printer supplied by Spring Boot structured logging
   */
  public PrivateStackTracePrinter(StandardStackTracePrinter printer) {
    this.printer =
        printer.withFormatter(failure -> failure.getClass().getName()).withoutSuppressed();
  }

  /** {@inheritDoc} */
  @Override
  public void printStackTrace(Throwable failure, Appendable output) throws IOException {
    printer.printStackTrace(failure, output);
  }
}
