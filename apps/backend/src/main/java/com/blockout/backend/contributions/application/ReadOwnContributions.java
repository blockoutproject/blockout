package com.blockout.backend.contributions.application;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.application.AssessContribution.Assessment;
import com.blockout.backend.contributions.domain.ContributionEligibility;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Caller-only coherent private contribution reads; a failed read never becomes an empty page. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadOwnContributions {
  private final ContributionStore store;
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;
  private final CurrentPermissions permissions;
  private final Clock clock;
  private final AssessContribution eligibility;

  /**
   * Reads current eligibility, quota usage, exact proposal count, owned active version and one
   * twenty-item personal page in one snapshot.
   *
   * @param owner original admitted account
   * @param matchId currently viewable match
   * @param page zero-based bounded page index
   * @return one coherent detached response
   * @throws IllegalArgumentException when the page exceeds the supported database offset range
   * @throws AccountNotFoundException when the original owner no longer exists
   * @throws SportingResourceNotFoundException when the exact match is unknown or hidden
   */
  public Page read(UUID owner, UUID matchId, long page) {
    if (page < 0 || page > 107374182) throw new IllegalArgumentException("Invalid page");
    Facts facts = require(owner, matchId);
    ContributionState state = store.state(matchId);
    Instant now = clock.instant();
    boolean moderator = permissions.forAccount(owner).contains(Permission.MODERATE_STREAM_LINKS);
    Assessment assessment = eligibility.evaluate(owner, facts, state, moderator, null, now);
    ContributionEligibility.Decision decision = assessment.decision();
    Instant eligibleAt =
        switch (decision.status()) {
          case ACCOUNT_TOO_YOUNG ->
              ContributionEligibility.accountEligibleAt(assessment.principalCreatedAt());
          case WINDOW_NOT_OPEN ->
              ContributionEligibility.windowOpensAt(facts.schedule().reliableStart());
          case DAILY_MATCH_LIMIT -> assessment.day().endsAt();
          default -> null;
        };
    return new Page(
        Long.toString(state.revision()),
        decision.status(),
        assessment.requiresApproval(),
        eligibleAt,
        assessment.usage(),
        assessment.day().endsAt(),
        store.ownProposalCount(matchId, owner),
        store.ownActive(matchId, owner).orElse(null),
        store.own(matchId, owner, (int) page),
        page);
  }

  /**
   * Reads only the exact caller-owned member, deliberately hiding foreign history.
   *
   * @param owner original admitted account
   * @param matchId currently viewable match
   * @param id exact requested version
   * @return authorized member and its current match revision
   * @throws AccountNotFoundException when the original owner no longer exists
   * @throws SportingResourceNotFoundException for a missing, hidden or foreign member
   */
  public Detail member(UUID owner, UUID matchId, UUID id) {
    require(owner, matchId);
    ContributionVersion version =
        store
            .version(id)
            .filter(v -> v.matchId().equals(matchId) && owner.equals(v.ownerId()))
            .orElseThrow(SportingResourceNotFoundException::new);
    return new Detail(Long.toString(store.state(matchId).revision()), version);
  }

  /**
   * Rechecks the original account and current sporting viewability without creating either.
   *
   * @param owner original admitted identity
   * @param matchId requested match
   * @return current sporting context
   * @throws AccountNotFoundException after original-account erasure
   * @throws SportingResourceNotFoundException for an unknown or hidden match
   */
  private Facts require(UUID owner, UUID matchId) {
    if (!accounts.exists(owner)) throw new AccountNotFoundException();
    Facts facts = sporting.read(matchId);
    if (!facts.viewable()) throw new SportingResourceNotFoundException();
    return facts;
  }

  /**
   * Current private context, owned active version, proposal total and page; no cross-request
   * snapshot is promised.
   *
   * @param revision opaque match editing revision
   * @param eligibility current submission outcome before any address-specific duplicate check
   * @param requiresApproval whether an otherwise permitted submission awaits moderation
   * @param eligibleAt known limiting time boundary, or null when time alone cannot resolve refusal
   * @param usage derived ordinary usage across all relevant versions
   * @param dayEndsAt next Paris midnight
   * @param proposalCount all caller-owned versions in every state, independent of quota and
   *     pagination
   * @param activeContribution current caller-owned active version independent of pagination, or
   *     null when absent
   * @param versions caller-only native Slice
   * @param page requested zero-based index
   */
  public record Page(
      String revision,
      ContributionEligibility.Status eligibility,
      boolean requiresApproval,
      Instant eligibleAt,
      ContributionQuota.Usage usage,
      Instant dayEndsAt,
      long proposalCount,
      ContributionVersion activeContribution,
      ContributionStore.VersionPage versions,
      long page) {}

  /**
   * Exact authorized version with its current match revision.
   *
   * @param revision current opaque match editing revision
   * @param version caller-owned version
   */
  public record Detail(String revision, ContributionVersion version) {}
}
