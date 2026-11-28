package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Exercises accepted schedules through the generated anonymous GET and migrated PostgreSQL. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@DisplayName("Public match detail")
class MatchDetailIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private AcceptCalendar calendars;
  @Autowired private SportingObservationMapper observations;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private MockMvc mvc;

  @ParameterizedTest(name = "{0} in {1}")
  @CsvSource({
    "FFVB, Europe/Berlin, 2026-10-24T16:30:00Z, https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php",
    "LNV, Europe/London, 2026-10-24T17:30:00Z, https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=1"
  })
  @DisplayName("Reads the resolved source time and calendar for a match without documents")
  void readsDatedMatchWithoutDocuments(
      CollectionProviderEnum provider, String zone, String start, String calendar)
      throws Exception {
    // Given
    SportingIngestionFixture.reset(database);
    Scope scope =
        SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes, provider);
    TeamCandidate home =
        provider == CollectionProviderEnum.FFVB
            ? new TeamCandidate(null, "Home", "00259", null)
            : new TeamCandidate("PRO-HOME", "Home", null, null);
    TeamCandidate away =
        provider == CollectionProviderEnum.FFVB
            ? new TeamCandidate(null, "Away", "00260", null)
            : new TeamCandidate("PRO-AWAY", "Away", null, null);
    Instant observed = Instant.parse("2026-10-20T12:00:00Z");
    MatchObservation.Facts schedule =
        observations.toFacts(
            new MatchFactsInternalRequest()
                ._localDate(LocalDate.of(2026, 10, 24))
                ._localTime("18:30")
                .timeZone(zone));
    ObservationOutcome match =
        calendars
            .accept(
                scope.pool(),
                new CalendarObservation(
                    new MatchObservation.Context(scope.cycle().id(), 1, observed, null),
                    true,
                    List.of(new CalendarObservation.Match("DETAIL259", home, away, schedule, null)),
                    List.of(),
                    List.of()))
            .outcomes()
            .getFirst();
    assertThat(match.resourceId()).isNotNull();

    // When / Then
    mvc.perform(get("/matches/{id}", match.resourceId()))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.match.id").value(match.resourceId().toString()))
        .andExpect(jsonPath("$.match.schedule.localDate").value("2026-10-24"))
        .andExpect(jsonPath("$.match.schedule.instant").value(start))
        .andExpect(jsonPath("$.match.schedule.timeZone").value(zone))
        .andExpect(jsonPath("$.match.schedule.observedAt").value(observed.toString()))
        .andExpect(jsonPath("$.officialCalendarUrl").value(calendar))
        .andExpect(jsonPath("$.documents").isArray())
        .andExpect(jsonPath("$.documents").isEmpty())
        .andExpect(jsonPath("$.match.result").doesNotHaveJsonPath())
        .andExpect(jsonPath("$.streamUrl").doesNotHaveJsonPath())
        .andExpect(jsonPath("$.streamContributionId").doesNotHaveJsonPath());
  }
}
