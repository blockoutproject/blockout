package com.blockout.backend.contributions.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.Decision;
import com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records one reason on the viewed version and retains an unresolved hold after automatic hiding.
 */
@Service
@RequiredArgsConstructor
public class ReportContribution {
  private final ContributionStore store;
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;
  private final Clock clock;

  /**
   * Reports under sporting roots then sorted account locks. Ordinary admitted usable accounts have
   * the current F12 reporting right; publication age and quotas confer no reporting authority. A
   * duplicate returns unchanged even after hiding, before lifecycle and threshold evaluation.
   *
   * @param reporter original usable account, rechecked under its erasure lock
   * @param versionId exact viewed version; never replaced by the current active identity
   * @param reason mandatory private reason, trimmed once before insertion
   * @return whether a report was newly recorded
   * @throws InvalidReason for a whitespace-only reason
   * @throws AccountNotFoundException when the original account no longer exists
   * @throws SportingResourceNotFoundException for an unknown version or unavailable match
   * @throws AccessDeniedException for self-reporting
   * @throws ContributionConflictException for an inactive target not already reported
   */
  @Transactional
  public boolean report(UUID reporter, UUID versionId, String reason) {
    String trimmed = reason.strip();
    if (trimmed.isEmpty()) throw new InvalidReason();
    UUID matchId =
        store.matchForVersion(versionId).orElseThrow(SportingResourceNotFoundException::new);
    Facts facts = sporting.lock(matchId);
    Set<UUID> affected = new HashSet<>(store.attributionAccounts(matchId));
    affected.add(reporter);
    for (UUID account : affected.stream().sorted().toList()) {
      boolean exists = accounts.lock(account);
      if (account.equals(reporter) && !exists) throw new AccountNotFoundException();
    }
    if (!facts.viewable()) throw new SportingResourceNotFoundException();
    ContributionVersion version =
        store.version(versionId).orElseThrow(SportingResourceNotFoundException::new);
    if (store.reported(versionId, reporter)) return false;
    if (reporter.equals(version.ownerId()))
      throw new AccessDeniedException("Action is not permitted");
    if (version.state() != State.ACTIVE) throw new ContributionConflictException();
    Instant now = clock.instant();
    long total = store.report(versionId, reporter, trimmed, now);
    store.advance(matchId, false);
    if (total >= (facts.definitiveResult() ? 10 : 3)) {
      store.decide(versionId, State.HIDDEN, new Decision(DecisionKind.HIDING, now, null));
      store.hold(matchId, versionId);
    }
    return true;
  }

  /** Refuses an empty normalized private reason without retaining the rejected content. */
  public static final class InvalidReason extends RuntimeException {}
}
