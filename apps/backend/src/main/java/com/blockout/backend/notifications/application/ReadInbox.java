package com.blockout.backend.notifications.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.notifications.application.InboxReadStore.Continuation;
import com.blockout.backend.notifications.application.InboxReadStore.Entry;
import com.blockout.backend.notifications.application.InboxReadStore.Page;
import com.blockout.backend.notifications.application.InboxReadStore.Summary;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Current owner reads share one short consistent snapshot across selection and owner hydration. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadInbox {
  private final InboxReadStore store;
  private final AccountAccess accounts;
  private final Clock clock;

  /**
   * Reads one current bounded inbox page.
   *
   * @param owner captured original owner
   * @param after exclusive continuation, or null
   * @return bounded current page
   * @throws NotificationNotFoundException after original account removal
   */
  public Page page(NotificationContext owner, Continuation after) {
    requireOwner(owner);
    return store.page(owner, after, clock.instant());
  }

  /**
   * Reads the exact current retained entry.
   *
   * @param owner captured original owner
   * @param id exact personal entry
   * @return current retained representation without marking it read
   * @throws NotificationNotFoundException for missing, hidden, expired or foreign entry
   */
  public Entry member(NotificationContext owner, UUID id) {
    requireOwner(owner);
    return store.member(owner, id, clock.instant()).orElseThrow(NotificationNotFoundException::new);
  }

  /**
   * Returns the current whole-inbox aggregate.
   *
   * @param owner captured original owner
   * @return current whole-inbox summary
   * @throws NotificationNotFoundException after original account removal
   */
  public Summary summary(NotificationContext owner) {
    requireOwner(owner);
    return store.summary(owner, clock.instant());
  }

  /**
   * Rejects a removed original account without resolving a replacement lifecycle.
   *
   * @param owner captured original lifecycle
   * @throws NotificationNotFoundException when that lifecycle no longer exists
   */
  private void requireOwner(NotificationContext owner) {
    if (!accounts.exists(owner.accountId())) throw new NotificationNotFoundException();
  }
}
