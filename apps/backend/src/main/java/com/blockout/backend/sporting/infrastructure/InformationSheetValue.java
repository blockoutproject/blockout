package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Qualified document locator; never an alternative sporting identity. */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class InformationSheetValue {
  @Setter private String seasonLabel;
  @Setter private String organizerReference;
  @Setter private String matchCode;
}
