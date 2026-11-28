package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Latest accepted source-season catalog order and provenance; no observation history. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_catalog")
class CatalogEntity {
  @Id private UUID sourceId;

  @Column(nullable = false)
  @Setter
  private long cycleOrder;

  @Column(nullable = false)
  @Setter
  private long readOrdinal;

  @Column(nullable = false)
  @Setter
  private Instant observedAt;

  @Setter private Instant providerPublishedAt;
  @Setter private Boolean complete;
  @Setter private Instant lastCompleteReadAt;

  @ElementCollection
  @CollectionTable(name = "sporting_catalog_phase", joinColumns = @JoinColumn(name = "source_id"))
  @MapKeyColumn(name = "phase_reference", columnDefinition = "text")
  @Column(name = "label", nullable = false)
  private Map<String, String> phaseLabels = new HashMap<>();

  /**
   * Creates the replacement scope at its existing F01 binding identity.
   *
   * @param sourceId authorized source-season binding
   */
  CatalogEntity(UUID sourceId) {
    this.sourceId = sourceId;
  }

  /** Replaces the current labels as part of the same authoritative catalogue write. */
  void replacePhaseLabels(Map<String, String> labels) {
    phaseLabels.clear();
    phaseLabels.putAll(labels);
  }
}
