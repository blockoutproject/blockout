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
  private final NotificationStore writes;
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;
  private final Clock clock;

  /**
   * Marks the exact current entry read, independently of navigation. Sporting season/division/match
   * locks precede the account; no sporting root is acquired afterward. Repetition never inserts.
   *
   * @param owner captured original owner
   * @param id exact personal entry
   * @return current committed-intent representation with true read state
   * @throws NotificationNotFoundException for a missing, hidden, expired or foreign entry/owner
   */
  @Transactional
  public InboxReadStore.Entry mark(NotificationContext owner, UUID id) {
    UUID matchId = reads.matchId(owner, id).orElseThrow(NotificationNotFoundException::new);
    sporting.lock(matchId);
    if (!accounts.lock(owner.accountId())) throw new NotificationNotFoundException();
    Instant now = clock.instant();
    InboxReadStore.Entry current =
        reads.member(owner, id, now).orElseThrow(NotificationNotFoundException::new);
    if (current.read()) return current;
    if (!writes.markRead(owner, id, now)) throw new NotificationNotFoundException();
    return reads.member(owner, id, now).orElseThrow(NotificationNotFoundException::new);
  }
}
