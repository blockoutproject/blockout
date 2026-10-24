package com.blockout.backend.contributions.application;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.domain.ContributionEligibility;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.notifications.application.AnnouncementRecipients;
import com.blockout.backend.notifications.application.AnnouncementRecipients.Selection;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns atomic submission, revision/quota decisions and mandatory announcement participation. */
@Service
@RequiredArgsConstructor
public class SubmitContribution {
  private final MatchContributionAccess sporting;
  private final AnnouncementRecipients recipients;
  private final AccountAccess accounts;
  private final CurrentPermissions permissions;
  private final ContributionStore store;
  private final ContributionTransitions transitions;
  private final Clock clock;

  /**
   * Locks sporting roots, then the complete actor/audience union before any contribution effect.
   *
   * @param accountId original admitted actor
   * @param matchId existing match
   * @param revision viewed opaque contribution revision
   * @param address explicit literal URI, never fetched
   * @param administrative requires the current complete stream moderation grant
   * @return committed version outcome; internal failures roll back the entire command
   */
  @Transactional
  public Outcome submit(
      UUID accountId, UUID matchId, String revision, URI address, boolean administrative) {
    StreamAddress proposed;
    try {
      proposed = new StreamAddress(address == null ? null : address.toString());
    } catch (IllegalArgumentException invalid) {
      throw new ContributionRejectedException(Status.INVALID_ADDRESS);
    }
    Facts facts = sporting.lock(matchId);
    Selection selection = recipients.select(facts.match(), Set.of(accountId));
    if (!selection.accounts().contains(accountId)) throw new AccountNotFoundException();
    boolean moderator =
        permissions.forAccount(accountId).contains(Permission.MODERATE_STREAM_LINKS);
    if (administrative && !moderator) throw new AccessDeniedException("Action is not permitted");
    ContributionState state = store.state(matchId);
    if (!Long.toString(state.revision()).equals(revision))
      throw new ContributionRejectedException(Status.STALE_REVISION);
    Instant now = clock.instant();
    ContributionEligibility.Decision decision =
        ContributionEligibility.evaluate(
            new ContributionEligibility.Actor(
                accountId, true, moderator, accounts.principalCreatedAt(accountId)),
            new ContributionEligibility.Match(
                facts.viewable(),
                facts.professional(),
                facts.schedule().localDate(),
                facts.schedule().reliableStart(),
                facts.definitiveResult()),
            new ContributionEligibility.Current(
                state,
                store.active(matchId).orElse(null),
                store.pending(matchId, accountId).orElse(null)),
            state.revision(),
            proposed,
            store.usage(accountId, matchId, ContributionQuota.dayAt(now)),
            now);
    if (decision.status() == Status.UNCHANGED)
      return new Outcome(
          store.version(decision.existingVersionId()).orElseThrow(), revision, false);
    if (decision.status() != Status.ACTIVE && decision.status() != Status.PENDING)
      throw new ContributionRejectedException(decision.status());
    ContributionVersion version =
        store.record(
            matchId, accountId, proposed, decision.status() == Status.ACTIVE, moderator, now);
    ContributionState next = store.advance(matchId, moderator);
    if (decision.status() == Status.ACTIVE)
      transitions.published(facts, selection.recipients(), now);
    return new Outcome(version, Long.toString(next.revision()), true);
  }

  /**
   * Completed outcome; unchanged submissions retain their exact current identity/revision.
   *
   * @param version new or already current caller-owned version
   * @param revision opaque revision after the accepted operation
   * @param created whether this operation recorded a new version
   */
  public record Outcome(ContributionVersion version, String revision, boolean created) {}
}
