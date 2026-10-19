package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One current publication scope; owned rows and columns replace atomically with the table. */
@Entity
@Table(name = "sporting_standings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class StandingsEntity {
  @Id private UUID poolId;
  @Setter private long cycleOrder;
  @Setter private long readOrdinal;

  @Setter
  @Enumerated(EnumType.STRING)
  private StandingsPublicationStateEnum publicationState;

  @Setter private Instant observedAt;
  @Setter private Instant providerPublishedAt;
  @Setter private Instant tableObservedAt;
  @Setter private Instant tablePublishedAt;

  @ElementCollection
  @CollectionTable(name = "sporting_standing_column", joinColumns = @JoinColumn(name = "pool_id"))
  @OrderColumn(name = "column_index")
  @Column(name = "label", columnDefinition = "text")
  @Setter
  private List<String> columns = new ArrayList<>();

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "pool_id", nullable = false)
  @OrderColumn(name = "row_index")
  @Setter
  private List<StandingRowEntity> rows = new ArrayList<>();

  /**
   * Establishes the current table scope, without inventing a published table.
   *
   * @param poolId known pool under its retained season lock
   */
  StandingsEntity(UUID poolId) {
    this.poolId = poolId;
  }
}
