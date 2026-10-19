package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
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

/** Current collection target persistence; application services own changes and transactions. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(CollectionTargetEntity.Key.class)
@Table(name = "collection_target")
class CollectionTargetEntity {
  @Id @Setter private UUID cycleId;
  @Id @Setter private UUID scopeId;

  @Id
  @Setter
  @Enumerated(EnumType.STRING)
  private CollectionTargetKindEnum kind;

  @Setter private UUID sourceBindingId;
  @Setter private String url;
  @Setter private String seasonLabel;
  @Setter private String competitionReference;
  @Setter private String packReference;
  @Setter private String poolReference;
  @Setter private String tourReference;
  @Setter private String groupReference;
  @Setter private UUID poolId;
  @Setter private UUID matchId;
  @Setter private UUID clubId;
  @Setter private String clubReference;
  @Setter private UUID divisionId;

  @Setter
  @Enumerated(EnumType.STRING)
  private SportFormatEnum format;

  @Setter
  @Enumerated(EnumType.STRING)
  private SportGenderEnum gender;

  @Setter private Instant lastAttemptAt;
  @Setter private Instant lastSuccessAt;
  @Setter private Instant fastWindowEndsAt;

  @Setter
  @Enumerated(EnumType.STRING)
  private CollectionProviderEnum provider;

  @Setter private String organizerReference;
  @Setter private String nativeMatchReference;

  /** Natural snapshot membership; no separate per-cycle scope identity is generated. */
  public record Key(UUID cycleId, UUID scopeId, CollectionTargetKindEnum kind)
      implements Serializable {}
}
