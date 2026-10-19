package com.blockout.backend.collection.infrastructure;

import com.blockout.backend.collection.application.CollectionState;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Current collection cycle persistence; application services own changes and transactions. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "collection_cycle")
class CollectionCycleEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "collection_cycle_order")
  @SequenceGenerator(
      name = "collection_cycle_order",
      sequenceName = "collection_cycle_order",
      allocationSize = 1)
  private long cycleOrder;

  @Column(unique = true, nullable = false)
  private UUID id;

  private UUID incarnationId;
  private UUID controlId;
  private UUID sourceBindingId;
  private long revision;
  private UUID requestId;

  @Enumerated(EnumType.STRING)
  private CollectionModeEnum mode;

  private Instant startedAt;
  @Setter private Instant completedAt;
  private String candidateUrl;
  private String seasonLabel;

  @Enumerated(EnumType.STRING)
  private CollectionProviderEnum provider;

  private String organizerReference;

  /**
   * Initializes the admitted purpose without manufacturing absent candidate or collection context.
   *
   * @param command validated admission
   * @param mode backend-authorized mode, absent for validation
   * @param candidate exact candidate snapshot, absent for a control passage
   * @param now logical admission start
   */
  CollectionCycleEntity(
      CollectionState.StartCycle command,
      CollectionModeEnum mode,
      CollectionState.Candidate candidate,
      Instant now) {
    id = command.cycleId();
    incarnationId = command.incarnationId();
    controlId = command.controlId();
    sourceBindingId = command.sourceBindingId();
    revision = command.revision();
    requestId = command.requestId();
    this.mode = mode;
    startedAt = now;
    if (candidate != null) {
      candidateUrl = candidate.candidateUrl();
      seasonLabel = candidate.seasonLabel();
      provider = candidate.provider();
      organizerReference = candidate.organizerReference();
    }
  }
}
