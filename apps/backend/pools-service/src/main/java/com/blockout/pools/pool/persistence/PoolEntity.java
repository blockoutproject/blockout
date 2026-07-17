package com.blockout.pools.pool.persistence;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
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
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pools", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"pool_code", "league_code", "season"}, name = "uix_pool")
})
public class PoolEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_code", nullable = false)
    private String poolCode;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(nullable = false)
    private String season;

    @Column(name = "league_name")
    private String leagueName;

    @Column(name = "raw_name", nullable = false)
    private String rawName;

    private String name;

    @Column(name = "short_name", nullable = false)
    private String shortName;

    @Column(name = "division_id", nullable = false)
    private Long divisionId;

    @Enumerated(EnumType.STRING)
    private FormatEnum format;

    @Enumerated(EnumType.STRING)
    private GenderEnum gender;

    @Builder.Default
    @Column(name = "followers_count", nullable = false)
    private Long followersCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
