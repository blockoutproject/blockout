package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

/** Native encounter identity; neither date nor participant pair is a unique reference. */
@Entity
@Table(name = "sporting_match")
public class MatchEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pool_id")
  private PoolEntity pool;

  @Column(nullable = false)
  private String reference;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "home_team_id")
  private TeamEntity homeTeam;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "away_team_id")
  private TeamEntity awayTeam;

  private LocalDate localDate;

  /** Allows Hibernate to instantiate the mapped match. */
  protected MatchEntity() {}

  /**
   * Establishes the supplied match state without generating another owner model.
   *
   * @param pool established contextual pool
   * @param reference exact native reference, preserving its original spelling
   * @param homeTeam established home participant
   * @param awayTeam established away participant
   */
  public MatchEntity(PoolEntity pool, String reference, TeamEntity homeTeam, TeamEntity awayTeam) {
    this.pool = pool;
    this.reference = reference;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
  }

  public UUID getId() {
    return id;
  }

  public PoolEntity getPool() {
    return pool;
  }

  public String getReference() {
    return reference;
  }

  public TeamEntity getHomeTeam() {
    return homeTeam;
  }

  public TeamEntity getAwayTeam() {
    return awayTeam;
  }
}
