package com.blockout.backend.collection.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/** Current collection control persistence; application services own changes and transactions. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "collection_control")
class CollectionControlEntity {
  @Id private UUID id;
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
  @CollectionTable(
      name = "collection_request_source",
      joinColumns = @JoinColumn(name = "control_id"))
  @Column(name = "source_binding_id")
  private Set<UUID> sourceBindingIds = new HashSet<>();

  @ElementCollection
  @CollectionTable(
      name = "collection_request_scope",
      joinColumns = @JoinColumn(name = "control_id"))
  @Column(name = "scope_id")
  private Set<UUID> scopeIds = new HashSet<>();
}
