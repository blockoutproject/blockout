package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
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

  /**
   * Creates the replacement scope at its existing F01 binding identity.
   *
   * @param sourceId authorized source-season binding
   */
  CatalogEntity(UUID sourceId) {
    this.sourceId = sourceId;
  }
}
