package com.blockout.matches.match.infrastructure.persistence.entities;

import com.blockout.matches.match.application.models.MatchStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "matches", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"match_code", "league_code", "season"}, name = "uix_match")
})
@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class MatchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_code", nullable = false)
    private String matchCode;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "live_code")
    private Long liveCode;

    @Column(name = "team_id_a", nullable = false)
    private Long teamIdA;

    @Column(name = "team_id_b", nullable = false)
    private Long teamIdB;

    @Column(name = "match_date", nullable = false)
    private Instant matchDate;

    @Column(name = "season", nullable = false)
    private String season;

    @Column(name = "\"set\"")
    private String set;

    @Column(name = "score")
    private String score;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MatchStatus status;

    @Column(name = "venue")
    private String venue;

    @Column(name = "first_referee")
    private String firstReferee;

    @Column(name = "second_referee")
    private String secondReferee;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_update", nullable = false)
    private Instant lastUpdate;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<MatchLiveLinkEntity> liveLinks;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        lastUpdate = now;
    }

    @PreUpdate
    void preUpdate() {
        lastUpdate = Instant.now();
    }
}
