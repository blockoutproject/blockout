package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Current per-scope evidence; logical order and recovery survive replacement of cycle context. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(CollectionResultEntity.Key.class)
@Table(name = "collection_result")
class CollectionResultEntity {
  @Id private UUID controlId;
  @Id private UUID scopeId;

  @Id
  @Enumerated(EnumType.STRING)
  private CollectionStageEnum stage;

  @Id
  @Enumerated(EnumType.STRING)
  private CollectionPhaseEnum phase;

  private Instant lastAttemptAt;
  private Instant lastSuccessAt;
  private Instant firstFailureAt;
  private long cycleOrder;
  private long readOrdinal;

  @Enumerated(EnumType.STRING)
  private CollectionOutcomeEnum outcome;

  private String reasonType;
  private String reason;
  private Long obtainedCount;
  private Long rejectedCount;

  /** Stable current-evidence key, independent of the cycle UUID. */
  public record Key(
      UUID controlId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase)
      implements Serializable {}
}
