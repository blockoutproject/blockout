package com.blockout.backend.contributions.application;

import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Persistent contribution reads for the command owner. Implementations return detached values; this
 * port acquires no sporting/account locks or provider evidence on the caller's behalf.
 */
public interface ContributionStore {
  /**
   * Locates a version's immutable sporting root without hydrating mutable attribution before locks.
   *
   * @param versionId exact retained identity
   * @return owning match, or empty for an unknown version
   */
  Optional<UUID> matchForVersion(UUID versionId);

  /**
   * Reads the original account's report existence without exposing private report content.
   *
   * @param versionId exact retained identity
   * @param reporterId original usable account
   * @return whether the account already reported this version
   */
  boolean reported(UUID versionId, UUID reporterId);

  /**
   * Inserts one new exact-version report and counts all retained rows in the same transaction.
   *
   * @param versionId active version checked under its sporting lock
   * @param reporterId original reporter protected by its account lock
   * @param reason trimmed nonempty private reason
   * @param now original report instant
   * @return total including anonymous retained rows and the inserted report
   */
  long report(UUID versionId, UUID reporterId, String reason, java.time.Instant now);

  /**
   * Sets the unresolved hold to the exact newly hidden version without advancing revision again.
   *
   * @param matchId locked sporting root with contribution activity
   * @param versionId same-match version hidden by the accepted report
   */
  void hold(UUID matchId, UUID versionId);

  /**
   * Reads active-link presence for a bounded set of already consultable sporting matches.
   *
   * @param matchIds identities admitted by F03 in the caller's consistent transaction
   * @return matches with a currently active contributed link, without address or attribution
   */
  Set<UUID> activeMatchIds(Set<UUID> matchIds);

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
   * Reads the caller-owned active version independently of the personal page.
   *
   * @param matchId current match
   * @param ownerId usable original account identity
   * @return the owner's current active version, or empty for absent, foreign or erased ownership
   */
  Optional<ContributionVersion> ownActive(UUID matchId, UUID ownerId);

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
   * Projects retained account attributions on current versions before account locking. Capabilities
   * are rechecked after locking, so both active and pending potential write participants are
   * included. Implementations must not attach mutable versions during this projection.
   *
   * @param matchId match already protected by the sporting roots
   * @return non-null owner/publication/decision identities to unite with actor and audience
   */
  Set<UUID> attributionAccounts(UUID matchId);

  /**
   * Projects historical source attribution without attaching a version before account locking.
   *
   * @param versionId exact source, including terminal versions
   * @return existing owner and useful decision actors, excluding nulls
   */
  Set<UUID> versionAttributionAccounts(UUID versionId);

  /**
   * Selects an existing pending version or creates a source-linked exempt reactivation, replacing
   * the active version and superseding all pending alternatives before selection.
   *
   * @param versionId exact checked pending or historical source
   * @param actor original moderator protected by the account lock
   * @param now accepted decision instant
   * @param reactivate whether to create a new version rather than approve the existing proposal
   * @return selected active member; the source remains historical on reactivation
   */
  ContributionVersion select(UUID versionId, UUID actor, java.time.Instant now, boolean reactivate);

  /**
   * Reads an exact version without authorizing its caller.
   *
   * @param id retained version identity
   * @return detached version, or empty if absent
   */
  Optional<ContributionVersion> version(UUID id);

  /**
   * Counts all caller-owned versions independently of lifecycle, pagination and quota
   * participation. The caller includes this aggregate in the same read snapshot as the personal
   * page.
   *
   * @param matchId current match
   * @param ownerId original account
   * @return exact count of this owner's versions, including the current active version
   */
  long ownProposalCount(UUID matchId, UUID ownerId);

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
   * Applies one accepted exact-version lifecycle decision without changing immutable version facts.
   * The caller has checked ownership, state and revision under sporting/account locks.
   *
   * @param versionId exact existing target version
   * @param state accepted terminal state
   * @param decision useful action, instant and original actor attribution
   * @return updated detached version; other versions and hold remain unchanged
   */
  ContributionVersion decide(
      UUID versionId, ContributionVersion.State state, ContributionVersion.Decision decision);

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
   * @param items currently authorized retained versions in stable order
   * @param hasNext whether the native Slice found another page
   */
  record VersionPage(java.util.List<ContributionVersion> items, boolean hasNext) {
    /**
     * Detaches the returned page.
     *
     * @param items currently authorized retained page
     * @param hasNext native continuation evidence
     */
    public VersionPage {
      items = java.util.List.copyOf(items);
    }
  }
}
