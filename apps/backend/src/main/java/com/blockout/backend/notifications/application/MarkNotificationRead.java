package com.blockout.backend.notifications.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Serializes monotone read intents with sporting roots then the original account lifecycle. */
@Service
@RequiredArgsConstructor
public class MarkNotificationRead {
  private final InboxReadStore reads;
  private final ReadInbox inbox;
  private final NotificationStore writes;
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;
  private final Clock clock;

  /**
   * Marks the exact current entry read, independently of navigation. Acquires sporting locks in
   * season, current division and match order before locking the account. Then checks current access
   * through the inbox member read and reuses that projection after a successful update.
   *
   * @param owner captured original owner
   * @param id exact personal entry
   * @return current entry with true read state
   * @throws NotificationNotFoundException for a missing, hidden, expired or foreign entry/owner
   */
  @Transactional
  public InboxViews.Entry mark(NotificationContext owner, UUID id) {
    UUID matchId = reads.matchId(owner, id).orElseThrow(NotificationNotFoundException::new);
    sporting.lockMatch(matchId);
    if (!accounts.lock(owner.accountId())) {
      throw new NotificationNotFoundException();
    }
    Instant now = clock.instant();
    InboxViews.Entry current = inbox.member(owner, id, now);
    if (current.read()) {
      return current;
    }
    if (!writes.markRead(owner, id, now)) {
      throw new NotificationNotFoundException();
    }
    return new InboxViews.Entry(
        current.id(),
        current.createdAt(),
        current.family(),
        current.variant(),
        true,
        current.match(),
        current.publicLink());
  }
}
