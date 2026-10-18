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
import java.util.UUID;

/** Retained unique team/pool relation; later visibility rules govern its current use. */
@Entity
@Table(name = "sporting_participation")
public class ParticipationEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "team_id")
  private TeamEntity team;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pool_id")
  private PoolEntity pool;

  @Column(nullable = false)
  private boolean current;

  /** Allows Hibernate to instantiate the mapped participation. */
  protected ParticipationEntity() {}

  /**
   * Establishes the supplied participation state without generating another owner model.
   *
   * @param team established compatible seasonal team
   * @param pool established contextual pool
   * @param current current participation presence, independent of retention
   */
  public ParticipationEntity(TeamEntity team, PoolEntity pool, boolean current) {
    this.team = team;
    this.pool = pool;
    this.current = current;
  }

  public UUID getId() {
    return id;
  }

  public TeamEntity getTeam() {
    return team;
  }

  public PoolEntity getPool() {
    return pool;
  }

  public boolean getCurrent() {
    return current;
  }
}
