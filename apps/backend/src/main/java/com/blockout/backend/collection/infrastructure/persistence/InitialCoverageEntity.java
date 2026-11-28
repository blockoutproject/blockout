package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Current initial selection and evidence; discarded cycle contexts never cascade into this report.
 */
@Entity
@Table(name = "collection_initial_coverage")
@IdClass(InitialCoverageEntity.Key.class)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class InitialCoverageEntity {
  @Id private UUID sourceBindingId;
  @Id private UUID scopeId;

  @Id
  @Enumerated(EnumType.STRING)
  private CollectionStageEnum stage;

  @Id
  @Enumerated(EnumType.STRING)
  private CollectionPhaseEnum phase;

  @Enumerated(EnumType.STRING)
  private InitialCoverage.Status status;

  private UUID cycleId;
  private long cycleOrder;
  private long readOrdinal;
  private Long obtainedCount;
  private Long rejectedCount;

  /** Stable report identity, shared neither with ordinary evidence nor an execution-history key. */
  public record Key(
      UUID sourceBindingId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase)
      implements Serializable {}
}
