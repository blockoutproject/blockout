package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Native provider grouping within a season; it is not a division or a team identity. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_pack")
public class PackEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "season_id")
  private SeasonEntity season;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CollectionProviderEnum provider;

  @Column(nullable = false)
  private String organizerReference;

  @Column(nullable = false)
  private String reference;

  @Version private long revision;

  @Embedded @Setter private ClassificationSetting setting;

  /**
   * Establishes the supplied pack state without generating another owner model.
   *
   * @param season existing canonical season owner
   * @param provider designated native authority
   * @param organizerReference qualified organizer or source-binding context
   * @param reference exact native reference, preserving its original spelling
   */
  public PackEntity(
      SeasonEntity season,
      CollectionProviderEnum provider,
      String organizerReference,
      String reference) {
    this.season = season;
    this.provider = provider;
    this.organizerReference = organizerReference;
    this.reference = reference;
  }
}
