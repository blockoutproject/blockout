package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
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
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Native encounter identity; neither date nor participant pair is a unique reference. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_match")
public class MatchEntity {
  @Setter private boolean present = true;
  @Setter private String detailUrl;
  @Setter private Instant reliableStart;

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pool_id")
  private PoolEntity pool;

  @Column(nullable = false)
  private String reference;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "home_team_id")
  private TeamEntity homeTeam;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "away_team_id")
  private TeamEntity awayTeam;

  @Setter private LocalDate localDate;
  @Setter private String localTime;
  @Setter private String timeZone;
  @Setter private Long acceptedCycleOrder;
  @Setter private Long acceptedReadOrdinal;
  @Setter private Instant scheduleObservedAt;
  @Setter private Instant schedulePublishedAt;
  @Setter private Instant referenceObservedAt;
  @Setter private Instant referencePublishedAt;

  @Setter
  @Enumerated(EnumType.STRING)
  private ResultStateEnum resultState;

  @Setter private Integer homeSets;
  @Setter private Integer awaySets;
  @Setter private String specialLabel;

  @Setter
  @Column(columnDefinition = "text")
  private String uninterpretedResult;

  @Setter private boolean setsAvailable;

  @ElementCollection
  @CollectionTable(name = "sporting_match_set", joinColumns = @JoinColumn(name = "match_id"))
  @OrderColumn(name = "set_index")
  @Setter
  private List<MatchSetValue> sets = new ArrayList<>();

  @Setter
  @Column(columnDefinition = "text")
  private String venueName;

  @Setter
  @Column(columnDefinition = "text")
  private String venueAddress;

  @Setter private boolean refereesAvailable;

  @ElementCollection
  @CollectionTable(name = "sporting_match_referee", joinColumns = @JoinColumn(name = "match_id"))
  @OrderColumn(name = "referee_index")
  @Column(name = "name", columnDefinition = "text")
  @Setter
  private List<String> referees = new ArrayList<>();

  @Setter
  @Column(columnDefinition = "text")
  private String professionalStreamUrl;

  @Setter
  @Column(columnDefinition = "text")
  private String scoresheetUrl;

  @Setter
  @Column(columnDefinition = "text")
  private String statisticsUrl;

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(
        name = "seasonLabel",
        column = @Column(name = "document_season_label", columnDefinition = "text")),
    @AttributeOverride(
        name = "organizerReference",
        column = @Column(name = "document_organizer_reference", columnDefinition = "text")),
    @AttributeOverride(
        name = "matchCode",
        column = @Column(name = "document_match_code", columnDefinition = "text"))
  })
  @Setter
  private InformationSheetValue informationSheet;

  @Setter private Instant resultObservedAt;
  @Setter private Instant resultPublishedAt;
  @Setter private Instant setsObservedAt;
  @Setter private Instant setsPublishedAt;
  @Setter private Instant venueObservedAt;
  @Setter private Instant venuePublishedAt;
  @Setter private Instant refereesObservedAt;
  @Setter private Instant refereesPublishedAt;
  @Setter private Instant streamObservedAt;
  @Setter private Instant streamPublishedAt;
  @Setter private Instant documentsObservedAt;
  @Setter private Instant documentsPublishedAt;

  /**
   * Establishes the supplied match state without generating another owner model.
   *
   * @param pool established contextual pool
   * @param reference exact native reference, preserving its original spelling
   * @param homeTeam established home participant
   * @param awayTeam established away participant
   */
  public MatchEntity(PoolEntity pool, String reference, TeamEntity homeTeam, TeamEntity awayTeam) {
    this.pool = pool;
    this.reference = reference;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
  }
}
