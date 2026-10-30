package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real caller-only native paging and derived current context; no test transaction encloses actions.
 */
@AutoConfigureMockMvc
@DisplayName("Private contribution owner reads")
class ReadOwnContributionsIntegrationTest extends ContributionScenario {
  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("Foreign members remain unavailable while collection reads include only the caller")
  void hidesForeignHistory() {
    // Given
    SubmitContribution.Outcome created = submit(AUTHOR, "0", "https://youtube.com/one", false);

    // When
    ReadOwnContributions.Page own = reads.read(OTHER, matchId, 0);

    // Then
    assertThat(own.versions().items()).isEmpty();
    assertThat(own.proposalCount()).isZero();
    assertThatThrownBy(() -> reads.member(OTHER, matchId, created.version().id()))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThat(reads.member(AUTHOR, matchId, created.version().id()).version().id())
        .isEqualTo(created.version().id());
  }

  @Test
  @DisplayName("A twenty-item Slice uses a stable UUID tie-break and independent aggregate usage")
  void pagesTiedVersions() throws Exception {
    // Given: moderator-exempt fixture versions exceed one page without violating ordinary quotas.
    TransactionTemplate tx = new TransactionTemplate(transactions);
    tx.executeWithoutResult(
        status -> {
          for (int n = 0; n < 22; n++)
            contributions.record(
                matchId, AUTHOR, new StreamAddress("https://youtube.com/" + n), true, true, NOW);
        });

    // When
    ReadOwnContributions.Page first = reads.read(AUTHOR, matchId, 0);
    ReadOwnContributions.Page second = reads.read(AUTHOR, matchId, 1);
    ResultActions firstResponse = readPage(AUTHOR, 0);
    ResultActions secondResponse = readPage(AUTHOR, 1);

    // Then
    firstResponse.andExpect(status().isOk()).andExpect(jsonPath("$.proposalCount").value(22));
    secondResponse.andExpect(status().isOk()).andExpect(jsonPath("$.proposalCount").value(22));
    assertThat(first.versions().items()).hasSize(20);
    assertThat(first.versions().hasNext()).isTrue();
    assertThat(second.versions().items()).hasSize(2);
    assertThat(second.versions().hasNext()).isFalse();
    List<UUID> ids =
        java.util.stream.Stream.concat(
                first.versions().items().stream(), second.versions().items().stream())
            .map(ContributionVersion::id)
            .toList();
    // PostgreSQL UUID ordering is unsigned byte order, independent of Java UUID.compareTo.
    assertThat(ids.stream().map(UUID::toString).toList()).isSorted().doesNotHaveDuplicates();
    assertThat(first.usage().versionsUsed()).isZero();
  }

  @Test
  @DisplayName("Current hiding revokes both collection and member access")
  void rejectsHiddenMatch() {
    // Given
    SubmitContribution.Outcome created = submit(AUTHOR, "0", "https://youtube.com/one", false);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable collection =
        () -> reads.read(AUTHOR, matchId, 0);
    org.assertj.core.api.ThrowableAssert.ThrowingCallable member =
        () -> reads.member(AUTHOR, matchId, created.version().id());

    // Then
    assertThatThrownBy(collection).isInstanceOf(SportingResourceNotFoundException.class);
    assertThatThrownBy(member).isInstanceOf(SportingResourceNotFoundException.class);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "The personal version count distinguishes an empty collection from an active version")
  void countsCurrentVersionPresence(boolean active) throws Exception {
    // Given
    if (active) submit(AUTHOR, "0", "https://youtu.be/active", false);

    // When
    ResultActions response = readPage(AUTHOR, 0);

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.proposalCount").value(active ? 1 : 0));
  }

  @Test
  @DisplayName(
      "The proposal count includes every own state independently of quotas and other scopes")
  void countsAllOwnVersions() throws Exception {
    // Given: historical moderator fixtures retain all states without bypassing ordinary limits.
    List<ContributionVersion.State> states =
        List.of(
            ContributionVersion.State.PENDING,
            ContributionVersion.State.REJECTED,
            ContributionVersion.State.CANCELLED,
            ContributionVersion.State.SUPERSEDED,
            ContributionVersion.State.WITHDRAWN,
            ContributionVersion.State.HIDDEN,
            ContributionVersion.State.REPLACED);
    UUID otherMatch = UUID.fromString("00000000-0000-4000-8000-000000000777");
    TransactionTemplate tx = new TransactionTemplate(transactions);
    tx.executeWithoutResult(
        transaction -> {
          contributions.record(
              matchId, OTHER, new StreamAddress("https://youtu.be/other-owner"), true, true, NOW);
          Map<ContributionVersion.State, UUID> historical =
              new EnumMap<>(ContributionVersion.State.class);
          for (ContributionVersion.State state : states) {
            ContributionVersion created =
                contributions.record(
                    matchId,
                    AUTHOR,
                    new StreamAddress("https://youtu.be/" + state.name()),
                    true,
                    true,
                    NOW);
            historical.put(state, created.id());
          }
          contributions.record(
              matchId, AUTHOR, new StreamAddress("https://youtu.be/active"), true, true, NOW);
          for (Map.Entry<ContributionVersion.State, UUID> historicalVersion : historical.entrySet())
            sql.update(
                "UPDATE contribution_version SET state=? WHERE id=?",
                historicalVersion.getKey().name(),
                historicalVersion.getValue());
          sql.update(
              "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,reliable_start) SELECT ?,pool_id,?,home_team_id,away_team_id,local_date,reliable_start FROM sporting_match WHERE id=?",
              otherMatch,
              "other-proposal-match",
              matchId);
          contributions.record(
              otherMatch,
              AUTHOR,
              new StreamAddress("https://youtu.be/other-match"),
              false,
              true,
              NOW);
        });

    // When
    ResultActions response = readPage(AUTHOR, 0);
    ReadOwnContributions.Page page = reads.read(AUTHOR, matchId, 0);

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.proposalCount").value(8));
    assertThat(page.usage().versionsUsed()).isZero();
    assertThat(page.versions().items()).hasSize(8);
    assertThat(page.versions().items())
        .extracting(ContributionVersion::state)
        .containsExactlyInAnyOrder(ContributionVersion.State.values());
  }

  @Test
  @DisplayName("The caller's active version remains actionable beyond the first twenty items")
  void exposesActiveVersionOutsidePage() throws Exception {
    // Given: historical moderator-exempt versions leave the active version older than one page.
    TransactionTemplate tx = new TransactionTemplate(transactions);
    ContributionVersion active =
        tx.execute(
            transaction -> {
              for (int n = 0; n < 21; n++)
                contributions.record(
                    matchId,
                    AUTHOR,
                    new StreamAddress("https://youtu.be/history-" + n),
                    true,
                    true,
                    NOW.minusSeconds(n));
              return contributions.record(
                  matchId,
                  AUTHOR,
                  new StreamAddress("https://youtu.be/older-active"),
                  true,
                  true,
                  NOW.minusSeconds(60));
            });

    // When
    ReadOwnContributions.Page first = reads.read(AUTHOR, matchId, 0);
    ResultActions firstResponse = readPage(AUTHOR, 0);
    ResultActions secondResponse = readPage(AUTHOR, 1);

    // Then
    assertThat(first.versions().items()).hasSize(20).doesNotContain(active);
    assertThat(first.usage().versionsUsed()).isZero();
    firstResponse
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.proposalCount").value(22))
        .andExpect(jsonPath("$.activeContribution.id").value(active.id().toString()))
        .andExpect(jsonPath("$.activeContribution.url").value("https://youtu.be/older-active"))
        .andExpect(jsonPath("$.activeContribution.state").value("active"))
        .andExpect(jsonPath("$.activeContribution.canWithdraw").value(true))
        .andExpect(jsonPath("$.activeContribution.canCancel").value(false))
        .andExpect(jsonPath("$.activeContribution.ownerId").doesNotExist());
    secondResponse
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activeContribution.id").value(active.id().toString()));
  }

  @ParameterizedTest
  @EnumSource(ActiveAbsence.class)
  @DisplayName("The private active projection is omitted without an exact current owner match")
  void omitsNonOwnedActiveVersion(ActiveAbsence absence) throws Exception {
    // Given
    if (absence != ActiveAbsence.NO_VERSION) {
      UUID owner = absence == ActiveAbsence.OTHER_OWNER ? OTHER : AUTHOR;
      SubmitContribution.Outcome created = submit(owner, "0", "https://youtu.be/active", false);
      if (absence == ActiveAbsence.ERASED_OWNER)
        sql.update(
            "UPDATE contribution_version SET owner_id=NULL WHERE id=?", created.version().id());
      if (absence == ActiveAbsence.WITHDRAWN)
        sql.update(
            "UPDATE contribution_version SET state='WITHDRAWN' WHERE id=?", created.version().id());
    }

    // When
    ResultActions response = readPage(AUTHOR, 0);

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activeContribution").doesNotHaveJsonPath());
  }

  /** Distinct absence cases prevent foreign, erased or historical versions from gaining actions. */
  private enum ActiveAbsence {
    NO_VERSION,
    OTHER_OWNER,
    ERASED_OWNER,
    WITHDRAWN
  }

  /**
   * Reads one real owner-scoped HTTP page with an already validated synthetic mobile principal.
   *
   * @param owner original account whose versions are visible
   * @param page explicit native twenty-item page
   * @return real generated response for assertions independent of loaded page size
   */
  private ResultActions readPage(UUID owner, int page) throws Exception {
    return mvc.perform(
        get("/accounts/" + owner + "/matches/" + matchId + "/stream-contributions")
            .queryParam("page", Integer.toString(page))
            .with(
                jwt()
                    .jwt(
                        token ->
                            token
                                .issuer("https://identity.example.invalid/")
                                .subject(owner.toString())
                                .claim("azp", "mobile-test"))));
  }
}
