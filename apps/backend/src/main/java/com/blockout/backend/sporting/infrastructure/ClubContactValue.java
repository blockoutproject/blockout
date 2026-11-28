package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One current relational contact field; no prior source or manual value survives replacement. */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ClubContactValue {
  @Setter private String sourceValue;
  @Setter private String manualValue;

  @Setter
  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ContactModeEnum mode = ContactModeEnum.SOURCE;

  @Setter private boolean restricted;
}
