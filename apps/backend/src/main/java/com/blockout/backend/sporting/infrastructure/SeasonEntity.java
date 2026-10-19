package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Canonical F02 season; F01 lifecycle references this identity instead of another season table. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_season")
public class SeasonEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Enumerated(EnumType.STRING)
  private CollectionSeasonStateEnum collectionState = CollectionSeasonStateEnum.PREPARING;

  @Version private long collectionRevision;

  @Column(nullable = false, unique = true)
  private long startYear;

  @Column(nullable = false)
  private String label;

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
}
