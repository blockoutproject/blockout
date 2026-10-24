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

  /**
   * Reads an exact version without authorizing its caller.
   *
   * @param id retained version identity
   * @return detached version, or empty if absent
   */
  Optional<ContributionVersion> version(UUID id);

  /**
   * Reads twenty caller-owned versions in creation descending/UUID ascending order.
   *
   * @param matchId current match
   * @param ownerId original account
   * @param page zero-based page, at most 107374182
   * @return native page content and continuation, without a total
   */
  VersionPage own(UUID matchId, UUID ownerId, int page);

  /**
   * Inserts an accepted version after replacing/superseding the authorized current rows. The caller
   * holds every necessary sporting/account lock and has completed eligibility checks.
   *
   * @param matchId locked current match
   * @param ownerId original submitting actor
   * @param address locally recognized literal
   * @param active whether the accepted decision publishes immediately
   * @param moderator whether the exact stream privilege exempts quota and supersedes all proposals
   * @param now original creation/decision instant
   * @return new detached version; failures roll back in the caller's transaction
   */
  ContributionVersion record(
      UUID matchId,
      UUID ownerId,
      com.blockout.backend.contributions.domain.StreamAddress address,
      boolean active,
      boolean moderator,
      java.time.Instant now);

  /**
   * Advances the match revision exactly once; moderator selection also resolves the hold.
   *
   * @param matchId match already locked by the caller
   * @param clearHold whether an accepted moderator selection resolves the current hold
   * @return updated detached editing state
   */
  ContributionState advance(UUID matchId, boolean clearHold);

  /**
   * Selects one bounded keyset page of active-link matches for the ordinary due pass.
   *
   * @param afterId exclusive last visited match UUID, or null for the first page
   * @return at most one hundred current candidate identities in database UUID order
   */
  java.util.List<UUID> activeMatches(UUID afterId);

  /**
   * Detached native page, independent from a total or cross-request snapshot promise.
   *
   * @param items current caller-only versions in stable order
   * @param hasNext whether the native Slice found another page
   */
  record VersionPage(java.util.List<ContributionVersion> items, boolean hasNext) {
    /**
     * Detaches the returned page.
     *
     * @param items current caller-only page
     * @param hasNext native continuation evidence
     */
    public VersionPage {
      items = java.util.List.copyOf(items);
    }
  }
}
