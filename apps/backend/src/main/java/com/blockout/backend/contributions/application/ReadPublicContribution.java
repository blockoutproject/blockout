package com.blockout.backend.contributions.application;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Supplies only the currently permitted active contribution; no private moderation data. */
@Service
@RequiredArgsConstructor
public class ReadPublicContribution {
  private final ContributionStore store;

  /**
   * Supplies current link presence after the caller has established sporting visibility in the same
   * transaction. Announcement callers hold the match lock through this read and allocation.
   *
   * @param matchIds bounded currently consultable match identities
   * @return identities with an active public contribution
   */
  @Transactional(readOnly = true)
  public Set<UUID> availableForConsultableMatches(Set<UUID> matchIds) {
    return store.activeMatchIds(matchIds);
  }

  /** Reads current presence for a match whose visibility the caller has checked under lock. */
  @Transactional(readOnly = true)
  public boolean availableForConsultableMatch(UUID matchId) {
    return store.activeMatchIds(Set.of(matchId)).contains(matchId);
  }

  /**
   * Resolves the public contribution for a match admitted by the caller in the same snapshot.
   *
   * @param matchId currently consultable match identity
   * @return exact contributed identity/address when publicly permitted
   */
  @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
  public Optional<Link> readForConsultableMatch(UUID matchId) {
    return store.active(matchId).map(version -> new Link(version.id(), version.address().value()));
  }

  /**
   * Selects the next bounded set of active-link candidates for the ordinary due pass. The consumer
   * must reread current sporting eligibility and contribution under its match lock.
   *
   * @param afterId exclusive previous match identity, or null for the first page
   * @return at most one hundred current candidates without private contribution details
   */
  @Transactional(readOnly = true)
  public List<UUID> activeMatches(UUID afterId) {
    return store.activeMatches(afterId);
  }

  /**
   * Public pair owned by one active version, without historical addresses or attribution.
   *
   * @param contributionId exact active version identity
   * @param address current authorized literal address
   */
  public record Link(UUID contributionId, String address) {}
}
