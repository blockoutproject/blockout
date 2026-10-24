package com.blockout.backend.contributions.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.contributions.domain.ContributionEligibility.Actor;
import com.blockout.backend.contributions.domain.ContributionEligibility.Current;
import com.blockout.backend.contributions.domain.ContributionEligibility.Match;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Current facts are controlled owner projections; no provider, result classifier or mutation fake.
 */
@DisplayName("Current contribution eligibility")
class ContributionEligibilityTest {
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final UUID VERSION = UUID.fromString("00000000-0000-4000-8000-000000000004");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private static final StreamAddress ADDRESS = new StreamAddress("https://youtube.com/watch?v=one");
  private static final ContributionQuota.Usage EMPTY = new ContributionQuota.Usage(0, 0, false);
  private static final ContributionQuota.Usage FULL = new ContributionQuota.Usage(3, 3, true);
  private static final Actor ORDINARY =
      new Actor(OWNER, true, false, NOW.minus(Duration.ofDays(7)));
  private static final Actor MODERATOR = new Actor(OWNER, false, true, null);
  private static final Match ELIGIBLE =
      new Match(true, false, LocalDate.of(2026, 10, 24), NOW.plusSeconds(3600), false);
  private static final Current INITIAL = new Current(ContributionState.initial(MATCH), null, null);

  @ParameterizedTest
  @CsvSource({
    "604799, ACCOUNT_TOO_YOUNG",
    "604800, ACTIVE",
    "604801, ACTIVE",
    "-1, ACCOUNT_TOO_YOUNG"
  })
  @DisplayName("Requires seven elapsed days from reliable principal creation, inclusively")
  void checksElapsedAge(long seconds, Status expected) {
    // Given
    Actor actor = new Actor(OWNER, true, false, NOW.minusSeconds(seconds));

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(actor, ELIGIBLE, INITIAL, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(expected);
  }

  @Test
  @DisplayName("Suspends only the age-dependent action when evidence is unknown")
  void rejectsUnknownAge() {
    // Given
    Actor actor = new Actor(OWNER, true, false, null);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(actor, ELIGIBLE, INITIAL, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.ACCOUNT_AGE_UNKNOWN);
  }

  @ParameterizedTest
  @CsvSource({"3599, ACTIVE", "3600, ACTIVE", "3601, WINDOW_NOT_OPEN"})
  @DisplayName("Uses confirmed H minus one elapsed hour, inclusively")
  void checksPublicationWindow(long untilStart, Status expected) {
    // Given
    Match match = new Match(true, false, ELIGIBLE.date(), NOW.plusSeconds(untilStart), false);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, match, INITIAL, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(expected);
  }

  @Test
  @DisplayName("Does not infer a start from a known date or an elapsed Completed category")
  void requiresConfirmedTime() {
    // Given
    Match dateOnly = new Match(true, false, LocalDate.of(2026, 10, 20), null, false);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, dateOnly, INITIAL, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.START_UNCONFIRMED);
  }

  @ParameterizedTest
  @ValueSource(strings = {"Europe/Paris", "America/New_York"})
  @DisplayName("Makes the same age and H minus one decision in either display zone")
  void ignoresDisplayZone(String displayZone) {
    // Given
    Instant now = NOW.atZone(ZoneId.of(displayZone)).toInstant();

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, INITIAL, 0, ADDRESS, EMPTY, now);

    // Then
    assertThat(result.status()).isEqualTo(Status.ACTIVE);
  }

  @Test
  @DisplayName("Requires approval after a definitive result even when the start is unconfirmed")
  void routesDefinitiveResultToApproval() {
    // Given
    Match match = new Match(true, false, ELIGIBLE.date(), null, true);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, match, INITIAL, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.PENDING);
  }

  @Test
  @DisplayName("Preserves a report hold independently of sporting corrections")
  void retainsReportHold() {
    // Given
    Current held = new Current(new ContributionState(MATCH, 4, VERSION), null, null);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, held, 4, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.PENDING);
  }

  @Test
  @DisplayName(
      "Reassesses corrected result and time without letting an old pending proposal impose approval")
  void reassessesCorrections() {
    // Given
    ContributionVersion pending = version(OWNER, ContributionVersion.State.PENDING, ADDRESS);
    Current current = new Current(new ContributionState(MATCH, 2, null), null, pending);
    StreamAddress third = new StreamAddress("https://twitch.tv/third");
    Match rescheduled = new Match(true, false, ELIGIBLE.date(), NOW.plusSeconds(7200), false);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, current, 2, third, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.ACTIVE);
    assertThat(
            ContributionEligibility.evaluate(ORDINARY, rescheduled, current, 2, third, EMPTY, NOW)
                .status())
        .isEqualTo(Status.WINDOW_NOT_OPEN);
    assertThat(current.ownPending()).isEqualTo(pending);
  }

  @Test
  @DisplayName("Lets a stream-only moderator bypass age, window, hold, result and quotas")
  void appliesOnlyEstablishedModeratorExceptions() {
    // Given
    Current held = new Current(new ContributionState(MATCH, 0, VERSION), null, null);
    Match match = new Match(true, false, ELIGIBLE.date(), null, true);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(MODERATOR, match, held, 0, ADDRESS, FULL, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.ACTIVE);
  }

  @ParameterizedTest
  @CsvSource({
    "false, false, true, MATCH_UNAVAILABLE",
    "true, true, true, PROFESSIONAL_MATCH",
    "true, false, false, MATCH_UNAVAILABLE"
  })
  @DisplayName(
      "Keeps visibility, professional context without clubs and usable date restrictions for moderators")
  void retainsIndependentRestrictions(
      boolean viewable, boolean professional, boolean hasDate, Status expected) {
    // Given
    Match match = new Match(viewable, professional, hasDate ? ELIGIBLE.date() : null, null, true);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(MODERATOR, match, INITIAL, 0, ADDRESS, FULL, NOW);

    // Then
    assertThat(result.status()).isEqualTo(expected);
    assertThat(
            ContributionEligibility.evaluate(ORDINARY, match, INITIAL, 0, ADDRESS, EMPTY, NOW)
                .status())
        .isEqualTo(expected);
  }

  @Test
  @DisplayName("Does not derive publication rights or moderator exemption from an unrelated grant")
  void requiresCurrentCapability() {
    // Given
    Actor unrelated = new Actor(OWNER, false, false, ORDINARY.principalCreatedAt());

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(unrelated, ELIGIBLE, INITIAL, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.FORBIDDEN);
  }

  @ParameterizedTest
  @EnumSource(
      value = ContributionVersion.State.class,
      names = {"ACTIVE", "PENDING"})
  @DisplayName("Recognizes a literal same-owner current repetition before reached quota refusal")
  void recognizesCurrentRepetition(ContributionVersion.State state) {
    // Given
    ContributionVersion version = version(OWNER, state, ADDRESS);
    Current current =
        new Current(
            new ContributionState(MATCH, 4, null),
            state == ContributionVersion.State.ACTIVE ? version : null,
            state == ContributionVersion.State.PENDING ? version : null);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, current, 4, ADDRESS, FULL, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.UNCHANGED);
    assertThat(result.existingVersionId()).isEqualTo(VERSION);
  }

  @Test
  @DisplayName(
      "Rejects a stale revision before recognizing an unchanged address, including for moderators")
  void rejectsStaleRepetition() {
    // Given
    Current current =
        new Current(
            new ContributionState(MATCH, 4, null),
            version(OWNER, ContributionVersion.State.ACTIVE, ADDRESS),
            null);

    // When
    ContributionEligibility.Decision ordinary =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, current, 3, ADDRESS, FULL, NOW);
    ContributionEligibility.Decision moderator =
        ContributionEligibility.evaluate(MODERATOR, ELIGIBLE, current, 3, ADDRESS, FULL, NOW);

    // Then
    assertThat(ordinary.status()).isEqualTo(Status.STALE_REVISION);
    assertThat(moderator.status()).isEqualTo(Status.STALE_REVISION);
  }

  @Test
  @DisplayName("Rechecks publication permission before recognizing an unchanged address")
  void rejectsRevokedRepetition() {
    // Given
    Current current =
        new Current(
            new ContributionState(MATCH, 4, null),
            version(OWNER, ContributionVersion.State.ACTIVE, ADDRESS),
            null);
    Actor revoked = new Actor(OWNER, false, false, ORDINARY.principalCreatedAt());

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(revoked, ELIGIBLE, current, 4, ADDRESS, FULL, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.FORBIDDEN);
  }

  @ParameterizedTest
  @EnumSource(
      value = ContributionVersion.State.class,
      names = {"REJECTED", "CANCELLED", "SUPERSEDED", "WITHDRAWN", "HIDDEN", "REPLACED"})
  @DisplayName("Never recognizes historical address reuse as an unchanged current submission")
  void refusesHistoricalRepetition(ContributionVersion.State state) {
    // Given
    Current staleRead =
        new Current(ContributionState.initial(MATCH), null, version(OWNER, state, ADDRESS));

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, staleRead, 0, ADDRESS, FULL, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.VERSION_LIMIT);
  }

  @ParameterizedTest
  @CsvSource(
      nullValues = "NULL",
      value = {"00000000-0000-4000-8000-000000000002", "NULL"})
  @DisplayName("Refuses an identical active address owned by someone else or retained ownerless")
  void preservesActiveOwnership(UUID owner) {
    // Given
    Current current =
        new Current(
            ContributionState.initial(MATCH),
            version(owner, ContributionVersion.State.ACTIVE, ADDRESS),
            null);

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, current, 0, ADDRESS, EMPTY, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.NOT_OWNER);
    assertThat(
            ContributionEligibility.evaluate(
                    MODERATOR,
                    ELIGIBLE,
                    current,
                    0,
                    new StreamAddress("https://twitch.tv/new"),
                    FULL,
                    NOW)
                .status())
        .isEqualTo(Status.ACTIVE);
  }

  @Test
  @DisplayName("Does not equate a changed query or host case at a reached quota")
  void comparesAddressesLiterally() {
    // Given
    Current current =
        new Current(
            ContributionState.initial(MATCH),
            version(OWNER, ContributionVersion.State.ACTIVE, ADDRESS),
            null);
    StreamAddress changed = new StreamAddress("https://YOUTUBE.COM/watch?v=one");

    // When
    ContributionEligibility.Decision result =
        ContributionEligibility.evaluate(ORDINARY, ELIGIBLE, current, 0, changed, FULL, NOW);

    // Then
    assertThat(result.status()).isEqualTo(Status.VERSION_LIMIT);
  }

  /**
   * Supplies a detached version without hiding the scenario's ownership, lifecycle or address.
   *
   * @param owner original account or erased attribution
   * @param state explicit current/historical lifecycle
   * @param address literal scenario address
   * @return version with immutable ordinary participation
   */
  private static ContributionVersion version(
      UUID owner, ContributionVersion.State state, StreamAddress address) {
    return new ContributionVersion(
        VERSION, MATCH, address, owner, state, NOW.minusSeconds(1), true, null, null, null, null);
  }
}
