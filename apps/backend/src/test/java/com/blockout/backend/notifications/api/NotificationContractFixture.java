package com.blockout.backend.notifications.api;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.MatchSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationFamilyEnum;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.PoolSummaryResponse;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.SportingClassificationResponse;
import com.blockout.backend.generated.mobile.model.SportingDivisionResponse;
import com.blockout.backend.generated.mobile.model.SportingIdentityResponse;
import com.blockout.backend.generated.mobile.model.SportingSeasonResponse;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Creates the generated notification response reused by MVC and JSON contract tests. */
final class NotificationContractFixture {
  static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000237");

  /** Prevents construction of this feature-local fixture factory. */
  private NotificationContractFixture() {}

  /**
   * Builds real generated F03 summaries without inventing scores or kickoff instants.
   *
   * @param family exact canonical composition under test
   * @return a valid generated response with known sporting absences
   */
  static NotificationResponse entry(NotificationFamilyEnum family) {
    OffsetDateTime created = OffsetDateTime.parse("2026-10-24T01:02:03.123456Z");
    MatchSummaryResponse match =
        new MatchSummaryResponse(
                ID,
                new PoolSummaryResponse(
                    new SportingIdentityResponse(ID, "Pool"),
                    new SportingSeasonResponse(ID, "2026–2027", 2026L),
                    new SportingClassificationResponse()),
                new SportingIdentityResponse(ID, "Home"),
                new SportingIdentityResponse(ID, "Away"),
                new MatchScheduleResponse(LocalDate.of(2026, 10, 24), created)
                    .timeZone("Europe/Paris"),
                CalendarCategoryEnum.COMPLETED)
            .result(
                new MatchResultResponse(ResultStateEnum.FINAL, created).specialLabel("Forfait"));
    return new NotificationResponse(
        ID,
        created,
        family,
        false,
        "Le résultat est disponible",
        match,
        new SportingDivisionResponse(ID, "Division", "#112233", null));
  }
}
