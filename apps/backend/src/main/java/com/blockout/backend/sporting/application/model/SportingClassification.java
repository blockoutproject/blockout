package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Complete accepted sporting classification; acquisition settings have a separate owner.
 *
 * @param divisionId established sporting division
 * @param format exact contract-owned format
 * @param gender exact contract-owned gender
 */
public record SportingClassification(
    UUID divisionId, SportFormatEnum format, SportGenderEnum gender) {
  /** Resolves the pack default only for an inheriting pool. The default may be absent. */
  public static SportingClassification effective(
      SportingClassification override, Supplier<SportingClassification> packDefault) {
    return override == null ? packDefault.get() : override;
  }
}
