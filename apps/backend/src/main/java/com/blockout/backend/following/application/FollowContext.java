package com.blockout.backend.following.application;

import java.util.Objects;
import java.util.UUID;

/**
 * Detached member context after F05 ownership and F12 admission; business services must still lock
 * the original account and check current sporting visibility before effects.
 *
 * @param accountId original usable account, never resolved to a replacement lifecycle
 * @param target exact sporting type and identity, independent of presentation and season filters
 */
public record FollowContext(UUID accountId, Target target) {
  /**
   * Requires complete identities without performing account, permission or sporting I/O.
   *
   * @param accountId already authorized original account
   * @param target sporting member identity
   */
  public FollowContext {
    Objects.requireNonNull(accountId);
    Objects.requireNonNull(target);
  }

  /** Supported sporting association kinds; no club or implicit pool/team relationship exists. */
  public enum TargetType {
    TEAM,
    POOL
  }

  /**
   * Identity supplied by the sporting owner, without private follow state or a copied DTO.
   *
   * @param type association kind
   * @param id original sporting identity
   */
  public record Target(TargetType type, UUID id) {
    /**
     * Requires a complete target; existence and viewability remain the sporting owner's decision.
     *
     * @param type exact association kind
     * @param id sporting UUID
     */
    public Target {
      Objects.requireNonNull(type);
      Objects.requireNonNull(id);
    }
  }

  /**
   * Immutable original account, sporting target and relation lifecycle for in-process consumers.
   *
   * @param id unique relation incarnation, replaced after unfollow/re-follow
   * @param accountId original account protected by the relation's FK
   * @param target exact typed sporting identity
   */
  public record Relation(UUID id, UUID accountId, FollowContext.Target target) {}
}
