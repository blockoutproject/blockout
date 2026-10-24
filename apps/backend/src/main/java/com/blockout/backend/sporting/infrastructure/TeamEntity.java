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
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Seasonal team; native professional identity stays independent of optional club attachment. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_team")
public class TeamEntity {
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
  private String competitionReference;

  private String nativeReference;

  /** Current source label; changing it preserves the established comparison key. */
  @Setter
  @Column(nullable = false)
  private String sourceName;

  @Setter private String manualName;
  @Setter private String manualShortName;
  @Setter private long presentationRevision;

  @Column(nullable = false)
  private String comparisonName;

  @Setter private byte[] logo;
  @Setter private String logoMediaType;
  @Setter private byte[] sourceLogo;
  @Setter private String sourceLogoMediaType;
  @Setter private Long logoCycleOrder;
  @Setter private Long logoReadOrdinal;
  @Setter private Instant logoObservedAt;
  @Setter private Instant logoPublishedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "club_id")
  private ClubEntity club;

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
  @CollectionTable(name = "sporting_team_alias", joinColumns = @JoinColumn(name = "team_id"))
  @Getter(AccessLevel.NONE)
  private Set<VerifiedName> aliases = new HashSet<>();

  /**
   * Establishes the supplied team state without generating another owner model.
   *
   * @param season existing canonical season owner
   * @param provider designated native authority
   * @param organizerReference qualified organizer or source-binding context
   * @param competitionReference qualified competition or championship reference
   * @param nativeReference native LNV TeamID or optional FFVB reference
   * @param sourceName required original source label
   * @param comparisonName established narrow FFVB comparison key
   * @param club required FFVB club or optional professional association
   * @param division established sporting division owner
   * @param format accepted sporting format
   * @param gender accepted sporting gender
   */
  public TeamEntity(
      SeasonEntity season,
      CollectionProviderEnum provider,
      String organizerReference,
      String competitionReference,
      String nativeReference,
      String sourceName,
      String comparisonName,
      ClubEntity club,
      DivisionEntity division,
      SportFormatEnum format,
      SportGenderEnum gender) {
    this.season = season;
    this.provider = provider;
    this.organizerReference = organizerReference;
    this.competitionReference = competitionReference;
    this.nativeReference = nativeReference;
    this.sourceName = sourceName;
    this.comparisonName = comparisonName;
    this.club = club;
    this.division = division;
    this.format = format;
    this.gender = gender;
  }
}
