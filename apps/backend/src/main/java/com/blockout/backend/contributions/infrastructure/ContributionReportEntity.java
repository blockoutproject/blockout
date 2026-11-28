package com.blockout.backend.contributions.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Counted exact-version fact; only F05 erasure may clear its attribution and original reason. */
@Entity
@Table(name = "contribution_report")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ContributionReportEntity {
  @Id
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(nullable = false, updatable = false)
  private UUID versionId;

  private UUID reporterId;
  private String reason;

  @Column(nullable = false, updatable = false)
  private Instant reportedAt;

  /**
   * Creates one immutable original report after current checks under sporting/account locks.
   *
   * @param versionId exact active version
   * @param reporterId original usable reporter
   * @param reason trimmed nonempty private reason
   * @param reportedAt original creation instant
   */
  ContributionReportEntity(UUID versionId, UUID reporterId, String reason, Instant reportedAt) {
    this.id = UUID.randomUUID();
    this.versionId = versionId;
    this.reporterId = reporterId;
    this.reason = reason;
    this.reportedAt = reportedAt;
  }
}
