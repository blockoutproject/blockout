package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.persistence.Column;
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
import java.util.UUID;

/** Native provider grouping within a season; it is not a division or a team identity. */
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

  /** Allows Hibernate to instantiate the mapped pack. */
  protected PackEntity() {}

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

  public UUID getId() {
    return id;
  }

  public SeasonEntity getSeason() {
    return season;
  }

  public CollectionProviderEnum getProvider() {
    return provider;
  }

  public String getOrganizerReference() {
    return organizerReference;
  }

  public String getReference() {
    return reference;
  }
}
