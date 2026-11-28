package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.domain.StreamAddress;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Backend-owned version facts with nullable attribution and same-match lineage enforced by SQL.
 * Immutable columns are excluded from JPA updates; lifecycle changes never reclassify quota usage.
 */
@Entity
@Table(name = "contribution_version")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ContributionVersionEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, updatable = false)
  private UUID matchId;

  @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
  private String address;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false, length = 32)
  private StreamAddress.Platform platform;

  @Setter(AccessLevel.PACKAGE)
  private UUID ownerId;

  @Setter(AccessLevel.PACKAGE)
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private State state;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false, updatable = false)
  private boolean quotaParticipating;

  @Column(updatable = false)
  private UUID sourceVersionId;

  @Setter(AccessLevel.PACKAGE)
  private UUID replacedByVersionId;

  @Setter(AccessLevel.PACKAGE)
  @Enumerated(EnumType.STRING)
  @Column(length = 32)
  private DecisionKind publicationKind;

  @Setter(AccessLevel.PACKAGE)
  private Instant publicationAt;

  @Setter(AccessLevel.PACKAGE)
  private UUID publicationActorId;

  @Setter(AccessLevel.PACKAGE)
  @Enumerated(EnumType.STRING)
  @Column(length = 32)
  private DecisionKind decisionKind;

  @Setter(AccessLevel.PACKAGE)
  private Instant decisionAt;

  @Setter(AccessLevel.PACKAGE)
  private UUID decisionActorId;

  /**
   * Initializes immutable creation facts, leaving publication/lifecycle effects to the command.
   *
   * @param matchId existing F02 match
   * @param address locally recognized literal
   * @param ownerId original account or null when copying an erased historical owner
   * @param state authorized initial lifecycle
   * @param createdAt creation instant
   * @param quotaParticipating true only for a newly recorded ordinary submission
   * @param sourceVersionId same-match reactivation source, or null for an original submission
   */
  public ContributionVersionEntity(
      UUID matchId,
      StreamAddress address,
      UUID ownerId,
      State state,
      Instant createdAt,
      boolean quotaParticipating,
      UUID sourceVersionId) {
    this.matchId = matchId;
    this.address = address.value();
    this.platform = address.platform();
    this.ownerId = ownerId;
    this.state = state;
    this.createdAt = createdAt;
    this.quotaParticipating = quotaParticipating;
    this.sourceVersionId = sourceVersionId;
  }
}
