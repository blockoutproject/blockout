package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Pure calendar selector invariants shared by HTTP and application callers. */
@DisplayName("Calendar request selectors")
class ConsultationRequestTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");

  @Test
  @DisplayName("Keeps a club calendar bound to its selected season")
  void requiresClubSeason() {
    // Given
    ZoneId groupingZone = ZoneId.of("Europe/Paris");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () ->
            new CalendarRequest(
                Kind.CLUB, ID, null, CalendarCategoryEnum.UPCOMING, groupingZone, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @EnumSource(
      value = Kind.class,
      names = {"TEAM", "POOL"})
  @DisplayName("Rejects a season on team and pool calendar selectors")
  void rejectsWrongSelector(Kind kind) {
    // Given
    ZoneId groupingZone = ZoneId.of("Europe/Paris");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> new CalendarRequest(kind, ID, ID, CalendarCategoryEnum.UPCOMING, groupingZone, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("Rejects a match as a calendar selector even without a season")
  void rejectsMatchSelector() {
    // Given
    ZoneId groupingZone = ZoneId.of("Europe/Paris");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () ->
            new CalendarRequest(
                Kind.MATCH, ID, null, CalendarCategoryEnum.UPCOMING, groupingZone, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(IllegalArgumentException.class);
  }
}
