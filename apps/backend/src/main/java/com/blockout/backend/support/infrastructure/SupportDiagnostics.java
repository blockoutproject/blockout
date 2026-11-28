package com.blockout.backend.support.infrastructure;

import com.blockout.backend.support.application.SupportUnavailableException;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Safe support failure owner in the existing SLF4J/ECS stream; environment comes from native
 * configuration.
 */
@Component
@Slf4j
public class SupportDiagnostics {
  /**
   * Records only bounded operational classification, excluding the cause and all private values.
   *
   * @param failure safe stage/reason; its internal cause is deliberately not rendered
   */
  public void failure(SupportUnavailableException failure) {
    log.atWarn()
        .addKeyValue("operation", "support_intake")
        .addKeyValue("stage", failure.getStage().name().toLowerCase(Locale.ROOT))
        .addKeyValue("outcome", "unavailable")
        .addKeyValue("reason", failure.getReason().name().toLowerCase(Locale.ROOT))
        .log("Support operation unavailable");
  }
}
