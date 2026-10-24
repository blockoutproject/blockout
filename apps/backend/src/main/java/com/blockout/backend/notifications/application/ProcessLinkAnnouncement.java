package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AnnouncementRecipients.Recipient;
import com.blockout.backend.notifications.application.ProcessResultAnnouncement.Created;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Required link allowance/inbox writes under the producer's match and complete account locks. */
@Service
@RequiredArgsConstructor
public class ProcessLinkAnnouncement {
  private final NotificationStore store;

  /**
   * Processes current availability; a due pass never invents a later publication.
   *
   * @param context current accepted owner facts, with public visibility already applied
   * @param recipients current audience selected under the complete account lock set
   * @return new allocations for after-commit handoff
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Created> process(Context context, List<Recipient> recipients) {
    MatchAnnouncementFacts facts = store.facts(context.match().id());
    if (!context.publicLink()) return List.of();
    NotificationFamily family;
    if (context.finalResult()) {
      if (!context.acceptedPublication() || facts.postResultProcessed()) return List.of();
      family = NotificationFamily.POST_RESULT_LINK;
      store.saveFacts(facts.consumePostResultLink());
    } else {
      if (facts.liveProcessed()
          || context.start() == null
          || context.now().isBefore(context.start())) return List.of();
      family = NotificationFamily.LIVE_LINK;
      store.saveFacts(facts.consumeLive());
    }
    List<Created> created = new ArrayList<>();
    for (Recipient recipient : recipients) {
      UUID id = UUID.randomUUID();
      NotificationStore.Entry entry =
          new NotificationStore.Entry(
              id,
              recipient.accountId(),
              context.match().id(),
              family,
              NotificationVariant.choose(id),
              context.now());
      store.create(entry);
      created.add(new Created(entry, recipient.relations()));
    }
    return List.copyOf(created);
  }

  /**
   * Current facts at actual processing; no address or historical audience is retained here.
   *
   * @param match locked sporting identity
   * @param publicLink current accepted availability after sporting visibility checks
   * @param finalResult current explicit F02 finality
   * @param start reliable H, or null when unconfirmed
   * @param acceptedPublication true only for an actually accepted public transition
   * @param now actual processing instant, independent from source publication time
   */
  public record Context(
      MatchView match,
      boolean publicLink,
      boolean finalResult,
      Instant start,
      boolean acceptedPublication,
      Instant now) {}
}
