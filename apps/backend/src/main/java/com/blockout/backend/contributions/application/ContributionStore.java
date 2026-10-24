package com.blockout.backend.contributions.application;

import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistent contribution reads for the command owner. Implementations return detached values; this
 * port acquires no sporting/account locks or provider evidence on the caller's behalf.
 */
public interface ContributionStore {
  /**
   * Reads state without creating activity; absence means initial revision and no hold.
   *
   * @param matchId existing F02 identity
   * @return existing state or {@link ContributionState#initial(UUID)}
   */
  ContributionState state(UUID matchId);

  /**
   * Reads the current active version independently of public sporting viewability.
   *
   * @param matchId existing F02 match
   * @return current version, including one whose owner has been erased
   */
  Optional<ContributionVersion> active(UUID matchId);

  /**
   * Reads only the original account's current proposal, never an anonymous proposal.
   *
   * @param matchId existing F02 match
   * @param ownerId usable original account identity
   * @return this owner's pending version, if present
   */
  Optional<ContributionVersion> pending(UUID matchId, UUID ownerId);

  /**
   * Aggregates persisted participating versions, independent of later state/grant changes. The
   * caller serializes across matches with the account lock and supplies Paris boundaries.
   *
   * @param ownerId original account identity
   * @param matchId target match, whose lifetime usage is counted
   * @param day half-open successive Paris-midnight interval
   * @return lifetime versions, distinct daily matches and target-match participation today
   */
  ContributionQuota.Usage usage(UUID ownerId, UUID matchId, ContributionQuota.Day day);
}
