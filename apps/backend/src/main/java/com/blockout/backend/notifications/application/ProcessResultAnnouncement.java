package com.blockout.backend.notifications.application;

import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consumes result allowances and allocates inbox entries inside the sporting producer transaction.
 */
@Service
@RequiredArgsConstructor
public class ProcessResultAnnouncement {
  private final NotificationStore store;
  private final AnnouncementRecipients recipients;
  private final AllocateAnnouncements allocations;
  private final ReadSportingData sporting;
  private final ReadPublicContribution links;

  /**
   * Records the accepted transition and inbox atomically in the producer's existing transaction.
   * The producer holds the F02 roots through visibility, F08 link selection and allocation. An
   * eligible result fixes its link composition while F08 publication is excluded by the same lock.
   *
   * @param transition trusted accepted owner facts, never raw client proposals
   * @return newly allocated entries for later transient handoff
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> process(Transition transition) {
    boolean previousFinal = Result.isFinal(transition.previous());
    if (!previousFinal && !Result.isFinal(transition.current())) {
      return List.of();
    }
    UUID matchId = transition.match().id();
    MatchAnnouncementFacts previous = store.facts(matchId);
    if (previous.resultProcessed()) {
      return List.of();
    }
    if (previousFinal
        || transition.firstObservation()
        || transition.reconstruction()
        || sporting
            .visibility(Kind.MATCH, matchId)
            .filter(SportingVisibility::viewable)
            .isEmpty()) {
      store.saveFacts(previous.consumeResult(null));
      return List.of();
    }
    NotificationFamily family =
        links.availableForConsultableMatches(Set.of(matchId)).contains(matchId)
            ? NotificationFamily.ENRICHED_RESULT
            : NotificationFamily.PLAIN_RESULT;
    store.saveFacts(previous.consumeResult(family));
    return allocations.create(
        matchId, family, recipients.select(transition.match()), transition.occurredAt());
  }

  /**
   * Trusted producer inputs captured under F02's shared root order; not an HTTP command.
   *
   * @param match current identity and team/pool roots
   * @param previous previous accepted F02 result, or absent
   * @param current new accepted F02 result, or absent
   * @param firstObservation whether F02 just discovered this encounter
   * @param reconstruction trusted initial-import/historical context resolved by F02
   * @param occurredAt original processing instant, independent of the sporting start time
   */
  public record Transition(
      MatchView match,
      Result previous,
      Result current,
      boolean firstObservation,
      boolean reconstruction,
      Instant occurredAt) {
    /**
     * Requires complete identity and original time; sporting absence remains meaningful.
     *
     * @param match current locked match identity
     * @param previous previous accepted result
     * @param current current accepted result
     * @param firstObservation trusted discovery context
     * @param reconstruction trusted import/reconstruction context
     * @param occurredAt UTC creation origin
     */
    public Transition {
      Objects.requireNonNull(match);
      Objects.requireNonNull(occurredAt);
    }
  }
}
