package com.blockout.backend.notifications.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.notifications.application.InboxReadStore.Selection;
import com.blockout.backend.notifications.application.InboxReadStore.Snapshot;
import com.blockout.backend.notifications.application.InboxViews.Continuation;
import com.blockout.backend.notifications.application.InboxViews.Entry;
import com.blockout.backend.notifications.application.InboxViews.Page;
import com.blockout.backend.notifications.application.InboxViews.Summary;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import com.blockout.backend.sporting.application.ReadSportingResources;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Current owner reads share one short consistent snapshot across selection and owner hydration. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadInbox {
  private final InboxReadStore store;
  private final AccountAccess accounts;
  private final Clock clock;
  private final ReadSportingResources sporting;
  private final ReadPublicContribution contributions;
  private final InboxViewMapper mapper;

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
    Instant now = clock.instant();
    Selection selected = store.page(owner, after, now);
    return new Page(hydrate(selected.entries(), now), selected.next());
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
    return member(owner, id, clock.instant());
  }

  /**
   * Composes the same exact member inside an already locked command at its captured instant.
   *
   * @param owner original account retained by the caller's lifecycle lock
   * @param id exact personal allocation
   * @param now shared command instant for eligibility, presentation and read mutation
   * @return current permitted entry without changing its state
   * @throws NotificationNotFoundException for a missing, hidden, expired or foreign entry/owner
   */
  @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
  public Entry member(NotificationContext owner, UUID id, Instant now) {
    return currentMember(owner, id, now).orElseThrow(NotificationNotFoundException::new);
  }

  /**
   * Reads a current member for best-effort eligibility without a normal absence exception marking
   * the caller's read transaction rollback-only.
   *
   * @param owner original account lifecycle
   * @param id original personal allocation
   * @return empty after owner/entry removal, expiry or current sporting restriction
   */
  public Optional<Entry> availableMember(NotificationContext owner, UUID id) {
    return currentMember(owner, id, clock.instant());
  }

  /**
   * Composes the shared current-member selection without assigning error semantics to absence.
   *
   * @param owner original lifecycle
   * @param id original allocation
   * @param now common retention and presentation instant
   * @return authorized current representation, or empty
   */
  private Optional<Entry> currentMember(NotificationContext owner, UUID id, Instant now) {
    if (!accounts.exists(owner.accountId())) return Optional.empty();
    return store.member(owner, id, now).map(row -> hydrate(List.of(row), now).getFirst());
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
   * Resolves current F03/F08 facts for one bounded authorized selection in this same snapshot.
   *
   * @param rows selected original personal identities and stable editorial values
   * @param now common age and presentation instant
   * @return current composed entries preserving the selection order
   */
  private List<Entry> hydrate(List<Snapshot> rows, Instant now) {
    Set<UUID> ids = rows.stream().map(Snapshot::matchId).collect(Collectors.toSet());
    Map<UUID, MatchSummary> matches = sporting.matchSummaries(ids, now);
    Set<UUID> links = contributions.availableForConsultableMatches(ids);
    return rows.stream()
        .map(row -> mapper.toView(row, matches.get(row.matchId()), links.contains(row.matchId())))
        .toList();
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
