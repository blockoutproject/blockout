package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Complete optional acquisition setting, embedded by packs and pool overrides. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Embeddable
public class ClassificationSetting {
  private UUID settingDivisionId;

  @Enumerated(EnumType.STRING)
  private SportFormatEnum settingFormat;

  @Enumerated(EnumType.STRING)
  private SportGenderEnum settingGender;

  /**
   * Keeps the three classification fields together; null belongs to the whole setting.
   *
   * @param divisionId target division foreign key
   * @param format canonical complete sport format
   * @param gender canonical complete sport gender
   */
  public ClassificationSetting(UUID divisionId, SportFormatEnum format, SportGenderEnum gender) {
    settingDivisionId = divisionId;
    settingFormat = format;
    settingGender = gender;
  }
}
