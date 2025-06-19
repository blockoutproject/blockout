package com.blockout.pools.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

import com.blockout.pools.models.enums.DivisionCode;
import com.blockout.pools.models.enums.Format;
import com.blockout.pools.models.enums.Gender;

import jakarta.persistence.*;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pools", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"pool_code", "league_code", "season"}, name = "uix_pool")
})
public class Pool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_code", nullable = false)
    private String poolCode;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(name = "season", nullable = false)
    private Integer season;

    @Column(name = "league_name")
    private String leagueName;

    @Column(name = "name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "division_code", nullable = false)
    private DivisionCode divisionCode;

    @Column(name = "division_name")
    private String divisionName;

    @Enumerated(EnumType.STRING)
    @Column(name = "format")
    private Format format;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;

    @Builder.Default
    @Column(name = "followers_count", nullable = false)
    private Long followersCount = 0L;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        this.lastUpdate = LocalDateTime.now();
    }
}