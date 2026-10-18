package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** Canonical F02 season; F01 lifecycle references this identity instead of another season table. */
@Entity
@Table(name = "sporting_season")
public class SeasonEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true)
  private long startYear;

  @Column(nullable = false)
  private String label;

  /** Allows Hibernate to instantiate the mapped season. */
  protected SeasonEntity() {}

  /**
   * Establishes the supplied season state without generating another owner model.
   *
   * @param startYear explicitly qualified sporting start year
   * @param label canonical season label
   */
  public SeasonEntity(long startYear, String label) {
    this.startYear = startYear;
    this.label = label;
  }

  public UUID getId() {
    return id;
  }

  public long getStartYear() {
    return startYear;
  }

  public String getLabel() {
    return label;
  }
}
