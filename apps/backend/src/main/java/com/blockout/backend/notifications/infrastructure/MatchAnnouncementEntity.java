package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** One nonpersonal match allowance row; no audience, sporting text, score or delivery state. */
@Entity
@Table(name = "match_announcement")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchAnnouncementEntity {
  @Id
  @Column(name = "match_id")
  private UUID matchId;

  @Column(nullable = false)
  private boolean liveProcessed;

  @Column(nullable = false)
  private boolean resultProcessed;

  @Column(nullable = false)
  private boolean postResultProcessed;

  @Enumerated(EnumType.STRING)
  private NotificationFamily resultComposition;

  /**
   * Creates minimal facts under the producer's retained match lock.
   *
   * @param facts already validated monotone allowances
   */
  MatchAnnouncementEntity(MatchAnnouncementFacts facts) {
    matchId = facts.matchId();
    advance(facts);
  }

  /**
   * Advances consumed categories without renewing an allowance or changing fixed composition.
   *
   * @param facts decisions computed under the same retained match lock
   */
  void advance(MatchAnnouncementFacts facts) {
    liveProcessed |= facts.liveProcessed();
    postResultProcessed |= facts.postResultProcessed();
    if (!resultProcessed && facts.resultProcessed()) {
      resultProcessed = true;
      resultComposition = facts.resultComposition();
    }
  }

  /**
   * Detaches minimal allowances without leaking a persistence object across owners.
   *
   * @return current nonpersonal match facts
   */
  MatchAnnouncementFacts facts() {
    return new MatchAnnouncementFacts(
        matchId, liveProcessed, resultProcessed, postResultProcessed, resultComposition);
  }
}
