package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
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
  private Kind kind;

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
  @Setter private String nativeTeamReference;

  /** Natural snapshot membership; no separate per-cycle scope identity is generated. */
  public record Key(UUID cycleId, UUID scopeId, Kind kind) implements Serializable {}

  /**
   * Retained snapshot spellings, including the retired logo-only role. Active protocol projection
   * refuses that role; keeping its persisted value allows ordinary replacement and discard.
   */
  enum Kind {
    DISCOVERY,
    CALENDAR,
    STANDINGS,
    DETAILS,
    LOGO,
    CLUB_SHEET,
    GEOCODING
  }
}
