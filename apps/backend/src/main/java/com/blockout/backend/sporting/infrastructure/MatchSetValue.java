package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Ordered published points, owned by one match. */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MatchSetValue {
  @Setter private int home;
  @Setter private int away;
}
