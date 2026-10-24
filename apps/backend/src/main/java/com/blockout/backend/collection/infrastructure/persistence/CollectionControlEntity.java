package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

/**
 * Current collection control persistence; application services own changes and transactions. Lists
 * fetch each pending-selection set together, without joining the two sets or issuing a separate
 * query for every control.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "collection_control")
class CollectionControlEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  private UUID seasonId;

  @Enumerated(EnumType.STRING)
  private CollectionFamilyEnum family;

  @Version private long revision;
  @Setter private boolean enabled;
  @Setter private UUID requestId;

  @Enumerated(EnumType.STRING)
  @Setter
  private CollectionModeEnum requestedMode;

  @Setter private UUID currentCycleId;
  @Setter private Instant lastStartedAt;
  @Setter private Instant lastAttemptAt;
  @Setter private Instant lastSuccessAt;

  @ElementCollection
  @Fetch(FetchMode.SUBSELECT)
  @CollectionTable(
      name = "collection_request_source",
      joinColumns = @JoinColumn(name = "control_id"))
  @Column(name = "source_binding_id")
  private Set<UUID> sourceBindingIds = new HashSet<>();

  @ElementCollection
  @Fetch(FetchMode.SUBSELECT)
  @CollectionTable(
      name = "collection_request_scope",
      joinColumns = @JoinColumn(name = "control_id"))
  @Column(name = "scope_id")
  private Set<UUID> scopeIds = new HashSet<>();

  /**
   * Enables the family's first qualified periodic launch.
   *
   * @param seasonId canonical season already locked by the caller
   * @param family competition family for this season
   */
  CollectionControlEntity(UUID seasonId, CollectionFamilyEnum family) {
    this.seasonId = seasonId;
    this.family = family;
    this.enabled = true;
  }
}
