package com.blockout.teams.team.infrastructure.persistence.entities;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Persistence-only Team representation mapped to the existing schema. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "teams", uniqueConstraints = @UniqueConstraint(
        name = "uix_team",
        columnNames = {"club_id", "division_id", "format", "gender", "raw_name", "season"}))
public class TeamEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_id", nullable = false)
    private String clubId;

    @Column(name = "raw_name", nullable = false)
    private String rawName;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "short_name", nullable = false)
    private String shortName;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(name = "division_id", nullable = false)
    private Long divisionId;

    @Column(name = "season", nullable = false)
    private String season;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false)
    private Format format;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private Gender gender;

    @Builder.Default
    @Column(name = "followers_count", nullable = false)
    private Long followersCount = 0L;

    @Column(name = "logo_url")
    private String logoUrl;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    /** Initializes application timestamps for a new row. */
    @PrePersist
    void initializeTimestamps() {
        createdAt = LocalDateTime.now();
        lastUpdate = createdAt;
    }

    /** Refreshes the application update timestamp before persistence. */
    @PreUpdate
    void refreshLastUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
