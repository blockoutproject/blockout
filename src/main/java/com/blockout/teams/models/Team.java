package com.blockout.teams.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "teams", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"pool_id", "team_name"}, name = "uix_team")
})
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_id", nullable = false)
    private String clubId;

    @Column(name = "pool_id", nullable = false)
    private Long poolId; 

    @Column(name = "team_name", nullable = false)
    private String teamName;

    @Column(name = "team_alias", nullable = true)
    private String teamAlias;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private TeamGender gender;

    @Column(name = "division_name", nullable = false)
    private String divisionName;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}