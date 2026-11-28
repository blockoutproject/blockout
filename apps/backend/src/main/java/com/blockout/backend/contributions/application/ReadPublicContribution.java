package com.blockout.backend.contributions.application;

import com.blockout.backend.contributions.domain.StreamAddress;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Reads public contributions for admitted consumers. */
@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY, readOnly = true)
public class ReadPublicContribution {
  private final ContributionStore store;

  /**
   * Supplies current link presence after the caller has established sporting visibility in the same
   * transaction. Announcement callers hold the match lock through this read and allocation.
   *
   * @param matchIds bounded currently consultable match identities
   * @return identities with an active public contribution
   */
  public Set<UUID> availableForConsultableMatches(Set<UUID> matchIds) {
    return store.activeMatchIds(matchIds);
  }

  /** Reads current presence for a match whose visibility the caller has checked under lock. */
  public boolean availableForConsultableMatch(UUID matchId) {
    return store.activeMatchIds(Set.of(matchId)).contains(matchId);
  }

  /**
   * Resolves the public contribution for a match admitted by the caller in the same snapshot.
   *
   * @param matchId currently consultable match identity
   * @return exact contributed identity/address when publicly permitted
   */
  public Optional<Link> readForConsultableMatch(UUID matchId) {
    return store.activeLink(matchId);
  }

  /**
   * Public pair owned by one active version, without historical addresses or attribution.
   *
   * @param contributionId exact active version identity
   * @param address current authorized literal address
   */
  public record Link(UUID contributionId, String address) {
    /** Applies the same address recognition as a full retained version. */
    public Link {
      address = new StreamAddress(address).value();
    }
  }
}
