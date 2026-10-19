package com.blockout.backend.collection.infrastructure;

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

/**
 * Current per-scope evidence used by admission; result submission completes this owner in its
 * story.
 */
@Getter
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

  /** Stable current-evidence key, independent of the cycle UUID. */
  public record Key(
      UUID controlId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase)
      implements Serializable {}
}
