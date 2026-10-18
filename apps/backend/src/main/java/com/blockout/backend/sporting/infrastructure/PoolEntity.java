package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** Contextual native pool and last accepted complete classification. */
@Entity
@Table(name = "sporting_pool")
public class PoolEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "season_id")
  private SeasonEntity season;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pack_id")
  private PackEntity pack;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CollectionProviderEnum provider;

  @Column(nullable = false)
  private String organizerReference;

  @Column(nullable = false)
  private String competitionReference;

  private String tourReference;
  private String groupReference;

  @Column(nullable = false)
  private String reference;

  @Column(nullable = false)
  private String sourceName;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "division_id")
  private DivisionEntity division;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SportFormatEnum format;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SportGenderEnum gender;

  @ElementCollection
  @CollectionTable(name = "sporting_pool_alias", joinColumns = @JoinColumn(name = "pool_id"))
  private Set<VerifiedName> aliases = new HashSet<>();

  /** Allows Hibernate to instantiate the mapped pool. */
  protected PoolEntity() {}

  /**
   * Establishes the supplied pool state without generating another owner model.
   *
   * @param season existing canonical season owner
   * @param pack existing native provider grouping
   * @param provider designated native authority
   * @param organizerReference qualified organizer or source-binding context
   * @param competitionReference qualified competition or championship reference
   * @param tourReference separately published tour, or null
   * @param groupReference separately qualified group, or null
   * @param reference exact native reference, preserving its original spelling
   * @param sourceName required original source label
   * @param division established sporting division owner
   * @param format accepted sporting format
   * @param gender accepted sporting gender
   */
  public PoolEntity(
      SeasonEntity season,
      PackEntity pack,
      CollectionProviderEnum provider,
      String organizerReference,
      String competitionReference,
      String tourReference,
      String groupReference,
      String reference,
      String sourceName,
      DivisionEntity division,
      SportFormatEnum format,
      SportGenderEnum gender) {
    this.season = season;
    this.pack = pack;
    this.provider = provider;
    this.organizerReference = organizerReference;
    this.competitionReference = competitionReference;
    this.tourReference = tourReference;
    this.groupReference = groupReference;
    this.reference = reference;
    this.sourceName = sourceName;
    this.division = division;
    this.format = format;
    this.gender = gender;
  }

  public UUID getId() {
    return id;
  }

  public SeasonEntity getSeason() {
    return season;
  }

  public PackEntity getPack() {
    return pack;
  }

  public CollectionProviderEnum getProvider() {
    return provider;
  }

  public String getOrganizerReference() {
    return organizerReference;
  }

  public String getCompetitionReference() {
    return competitionReference;
  }

  public String getTourReference() {
    return tourReference;
  }

  public String getGroupReference() {
    return groupReference;
  }

  public String getReference() {
    return reference;
  }

  public String getSourceName() {
    return sourceName;
  }

  public DivisionEntity getDivision() {
    return division;
  }

  public SportFormatEnum getFormat() {
    return format;
  }

  public SportGenderEnum getGender() {
    return gender;
  }
}
