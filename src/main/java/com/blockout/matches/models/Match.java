package com.blockout.matches.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.blockout.matches.models.enums.MatchStatus;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "matches", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"match_code", "league_code"}, name = "uix_match")
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
    private Long poolId; // Référence à la Pool par son ID (microservice Pool)

    @Column(name = "live_code", nullable = true)
    private Long liveCode;

    @Column(name = "team_id_a", nullable = false)
    private Long teamIdA; // Référence à l'équipe A (microservice Team)

    @Column(name = "team_id_b", nullable = false)
    private Long teamIdB; // Référence à l'équipe B (microservice Team)

    @Column(name = "match_date", nullable = false)
    private LocalDateTime matchDate;

    @Column(name = "set")
    private String set;

    @Column(name = "score")
    private String score;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MatchStatus status;

    @Column(name = "venue")
    private String venue;

    @Column(name = "referee1")
    private String referee1;

    @Column(name = "referee2")
    private String referee2;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}