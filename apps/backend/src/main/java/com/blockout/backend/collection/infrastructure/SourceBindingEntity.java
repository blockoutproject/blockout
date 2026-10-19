package com.blockout.backend.collection.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OptimisticLock;

/**
 * Current collection source binding persistence; application services own changes and transactions.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "collection_source_binding")
class SourceBindingEntity {
  @Id private UUID id;
  private UUID seasonId;

  @Enumerated(EnumType.STRING)
  private CollectionProviderEnum provider;

  private String organizerReference;
  @Setter private String candidateUrl;
  @Setter private String acceptedUrl;
  @Version private long revision;

  @Enumerated(EnumType.STRING)
  @Setter
  private SourceValidationStateEnum validationState;

  @Setter private Instant validatedAt;
  @Setter private String seasonEvidence;
  @Setter private boolean seasonConfirmed;
  @Setter private boolean locked;
  @Setter private boolean launched;

  @OptimisticLock(excluded = true)
  @Setter
  private UUID currentCycleId;
}
