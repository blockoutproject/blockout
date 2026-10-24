package com.blockout.backend.notifications.application;

import com.blockout.backend.following.application.FollowStore.Relation;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AnnouncementRecipients.Recipient;
import com.blockout.backend.notifications.application.NotificationStore.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Required local announcement participant; the F02/F08 producer binding is a separate lot. */
@Service
@RequiredArgsConstructor
public class ProcessResultAnnouncement {
  private final NotificationStore store;
  private final AnnouncementRecipients recipients;

  /**
   * Records the accepted transition and inbox atomically in the producer's existing transaction.
   * The producer must hold all necessary F02 roots and read the current public F08 link before
   * calling, with no account locks yet. Internal failures propagate; this method performs no I/O to
   * a transport/provider and creates no after-commit work.
   *
   * @param transition trusted accepted owner facts, never raw client proposals
   * @return newly allocated entries and original relation identities for later transient handoff
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Created> process(Transition transition) {
    MatchAnnouncementFacts previous = store.facts(transition.match().id());
    if (previous.resultProcessed()) return List.of();
    boolean previousFinal = isFinal(transition.previous());
    boolean currentFinal = isFinal(transition.current());
    if (!previousFinal && !currentFinal) return List.of();
    boolean eligible =
        !previousFinal
            && currentFinal
            && !transition.firstObservation()
            && !transition.reconstruction()
            && transition.viewable();
    NotificationFamily family =
        transition.publicLink()
            ? NotificationFamily.ENRICHED_RESULT
            : NotificationFamily.PLAIN_RESULT;
    store.saveFacts(previous.consumeResult(eligible ? family : null));
    if (!eligible) return List.of();
    List<Created> created = new ArrayList<>();
    for (Recipient recipient : recipients.select(transition.match())) {
      UUID id = UUID.randomUUID();
      Entry entry =
          new Entry(
              id,
              recipient.accountId(),
              transition.match().id(),
              family,
              NotificationVariant.choose(id),
              transition.occurredAt());
      store.create(entry);
      created.add(new Created(entry, recipient.relations()));
    }
    return List.copyOf(created);
  }

  /**
   * Uses only F02's explicit finality, independent of score, start time or presentation category.
   *
   * @param result accepted previous/current result, possibly absent after withdrawal
   * @return whether the designated owner recognizes a definitive result
   */
  private boolean isFinal(Result result) {
    return result != null && result.state() == ResultStateEnum.FINAL;
  }

  /**
   * Trusted producer inputs captured under F02's shared root order; not an HTTP command.
   *
   * @param match current identity and team/pool roots
   * @param previous previous accepted F02 result, or absent
   * @param current new accepted F02 result, or absent
   * @param firstObservation whether F02 just discovered this encounter
   * @param reconstruction trusted initial-import/historical context resolved by F02
   * @param viewable current owner-controlled public visibility
   * @param publicLink current F08 public-link availability under the same match lock
   * @param occurredAt original processing instant, independent of the sporting start time
   */
  public record Transition(
      MatchView match,
      Result previous,
      Result current,
      boolean firstObservation,
      boolean reconstruction,
      boolean viewable,
      boolean publicLink,
      Instant occurredAt) {
    /**
     * Requires complete identity and original time; sporting absence remains meaningful.
     *
     * @param match current locked match identity
     * @param previous previous accepted result
     * @param current current accepted result
     * @param firstObservation trusted discovery context
     * @param reconstruction trusted import/reconstruction context
     * @param viewable current sporting visibility
     * @param publicLink current accepted F08 availability
     * @param occurredAt UTC creation origin
     */
    public Transition {
      Objects.requireNonNull(match);
      Objects.requireNonNull(occurredAt);
    }
  }

  /**
   * Newly created personal allocation and original follow incarnations; never a durable send job.
   *
   * @param entry persisted unread personal entry
   * @param relations trigger-time origins for later continuity checks
   */
  public record Created(NotificationStore.Entry entry, Set<Relation> relations) {
    /**
     * Makes the eventual handoff independent of mutable selection collections.
     *
     * @param entry newly created immutable allocation
     * @param relations original current follows
     */
    public Created {
      relations = Set.copyOf(relations);
    }
  }
}
