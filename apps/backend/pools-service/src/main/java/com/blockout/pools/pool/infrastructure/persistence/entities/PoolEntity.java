package com.blockout.pools.pool.infrastructure.persistence.entities;

import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Persistence-only Pool representation mapped to the existing schema. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pools", uniqueConstraints = @UniqueConstraint(
        name = "uix_pool", columnNames = {"pool_code", "league_code", "season"}))
public class PoolEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "pool_code", nullable = false) private String poolCode;
    @Column(name = "league_code", nullable = false) private String leagueCode;
    @Column(name = "season", nullable = false) private String season;
    @Column(name = "league_name") private String leagueName;
    @Column(name = "raw_name") private String rawName;
    @Column(name = "name") private String name;
    @Column(name = "short_name") private String shortName;
    @Column(name = "division_id", nullable = false) private Long divisionId;
    @Enumerated(EnumType.STRING) @Column(name = "format") private Format format;
    @Enumerated(EnumType.STRING) @Column(name = "gender") private Gender gender;
    @Builder.Default @Column(name = "followers_count", nullable = false) private Long followersCount = 0L;
    @Builder.Default @Column(name = "active", nullable = false) private Boolean active = true;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "last_update") private LocalDateTime lastUpdate;

    @PrePersist
    void initializeTimestamps() { createdAt = LocalDateTime.now(); lastUpdate = createdAt; }

    @PreUpdate
    void refreshLastUpdate() { lastUpdate = LocalDateTime.now(); }
}
