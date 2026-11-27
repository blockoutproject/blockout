package com.blockout.backend.contributions.application;

import com.blockout.backend.contributions.domain.ContributionEligibility;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** One current eligibility input assembly for private reads and authorized submission decisions. */
@Component
@RequiredArgsConstructor
public class AssessContribution {
  private final ContributionStore store;

  /**
   * Evaluates the shared pure policy from current facts in the caller's consistent transaction.
   * Commands must first hold every required lock and check authorization and viewed revision.
   *
   * @param owner original admitted account
   * @param facts current sporting facts, protected by the command's locks when writing
   * @param state current match revision and hold
   * @param moderator current exact moderation capability
   * @param proposed recognized literal address, or null for an eligibility read
   * @param now one instant for window and quota boundaries
   * @return policy outcome with the exact inputs needed by private eligibility presentation
   */
  @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
  public Assessment evaluate(
      UUID owner,
      Facts facts,
      ContributionState state,
      boolean moderator,
      StreamAddress proposed,
      Instant now) {
    ContributionQuota.Day day = ContributionQuota.dayAt(now);
    UUID matchId = facts.match().id();
    ContributionQuota.Usage usage = store.usage(owner, matchId, day);
    Optional<ContributionVersion> active = store.active(matchId);
    // An eligibility read has no proposed address to compare with a pending version.
    ContributionVersion pending =
        proposed == null ? null : store.pending(matchId, owner).orElse(null);
    ContributionEligibility.Decision decision =
        ContributionEligibility.evaluate(
            new ContributionEligibility.Actor(owner, true, moderator),
            new ContributionEligibility.Match(
                facts.viewable(),
                facts.professional(),
                facts.schedule().localDate(),
                facts.schedule().reliableStart(),
                facts.definitiveResult()),
            new ContributionEligibility.Current(state, active.orElse(null), pending),
            proposed,
            usage,
            now);
    return new Assessment(
        decision,
        usage,
        day,
        active.filter(version -> owner.equals(version.ownerId())).orElse(null),
        ContributionEligibility.requiresApproval(moderator, facts.definitiveResult(), state));
  }

  /**
   * Decision and its coherent current presentation inputs; no later reread changes this result.
   *
   * @param decision current pure eligibility outcome
   * @param usage persisted ordinary quota participation
   * @param day Paris quota interval containing the evaluation instant
   * @param ownActive current active version only when it belongs to this owner, independent of
   *     pagination
   * @param requiresApproval approval rule for an otherwise permitted submission
   */
  public record Assessment(
      ContributionEligibility.Decision decision,
      ContributionQuota.Usage usage,
      ContributionQuota.Day day,
      ContributionVersion ownActive,
      boolean requiresApproval) {}
}
