package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Source-ordered official row; statistics are retained text, never recalculated sporting totals.
 */
@Entity
@Table(name = "sporting_standing_row")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class StandingRowEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Setter
  @Column(columnDefinition = "text")
  private String sourceName;

  @Setter
  @Column(columnDefinition = "text")
  private String nativeTeamReference;

  @Setter private Integer position;
  @Setter private UUID teamId;

  @ElementCollection
  @CollectionTable(name = "sporting_standing_statistic", joinColumns = @JoinColumn(name = "row_id"))
  @MapKeyColumn(name = "label", columnDefinition = "text")
  @Column(name = "value", columnDefinition = "text")
  @Setter
  private Map<String, String> statistics = new LinkedHashMap<>();
}
