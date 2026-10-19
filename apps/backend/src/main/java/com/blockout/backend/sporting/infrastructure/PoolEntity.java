package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Contextual native pool and last accepted complete classification. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_pool")
public class PoolEntity {
  @Setter private String calendarUrl;
  @Setter private String standingsUrl;
  @Setter private boolean catalogEligible = true;

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
  @Setter
  private DivisionEntity division;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Setter
  private SportFormatEnum format;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Setter
  private SportGenderEnum gender;

  @ElementCollection
  @CollectionTable(name = "sporting_pool_alias", joinColumns = @JoinColumn(name = "pool_id"))
  @Getter(AccessLevel.NONE)
  private Set<VerifiedName> aliases = new HashSet<>();

  @Version private long revision;

  @Embedded @Setter private ClassificationSetting setting;

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
}
