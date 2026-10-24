package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One current relational contact field; no prior source or manual value survives replacement. */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ClubContactValue {
  private String sourceValue;
  private String manualValue;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ContactModeEnum mode = ContactModeEnum.SOURCE;

  private boolean restricted;

  /**
   * Stores only the permitted current values after the owning use case's decision.
   *
   * @param value decided state, including its durable restriction
   */
  ClubContactValue(ContactValue value) {
    sourceValue = value.restricted() ? null : value.sourceValue();
    manualValue = value.restricted() ? null : value.manualValue();
    mode = value.mode();
    restricted = value.restricted();
  }

  /**
   * @return permitted immutable state, including when restored columns contain restricted data
   */
  ContactValue toValue() {
    return new ContactValue(
        restricted ? null : sourceValue, restricted ? null : manualValue, mode, restricted);
  }
}
