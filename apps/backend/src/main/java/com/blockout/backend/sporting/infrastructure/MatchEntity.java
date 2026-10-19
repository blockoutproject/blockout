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
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Native encounter identity; neither date nor participant pair is a unique reference. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_match")
public class MatchEntity {
  @Setter private String detailUrl;
  @Setter private Instant reliableStart;

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

  @Getter(AccessLevel.NONE)
  private LocalDate localDate;

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
}
