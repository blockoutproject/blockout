package com.blockout.matches.models.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.blockout.matches.models.enums.MatchStatus;

@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "matches", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "match_code", "league_code", "season" }, name = "uix_match")
})
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_code", nullable = false)
    private String matchCode;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "live_code", nullable = true)
    private Long liveCode;

    @Column(name = "live_edit_locked", nullable = false)
    private boolean liveEditLocked;

    @Column(name = "team_id_a", nullable = false)
    private Long teamIdA;

    @Column(name = "team_id_b", nullable = false)
    private Long teamIdB;

    @Column(name = "match_date", nullable = false)
    private LocalDateTime matchDate;

    @Column(name = "season", nullable = false)
    private String season;

    @Column(name = "set")
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

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}