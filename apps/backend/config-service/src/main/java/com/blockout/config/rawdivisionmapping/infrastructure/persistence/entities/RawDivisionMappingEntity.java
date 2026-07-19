package com.blockout.config.rawdivisionmapping.infrastructure.persistence.entities;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Persistence-only representation of the raw_division_mapping table. */
@Entity
@Table(name = "raw_division_mapping", uniqueConstraints = @UniqueConstraint(
        columnNames = {"raw_division_name", "league_code", "season"}, name = "uix_raw_division_mapping"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "raw_division_name", nullable = false) private String rawDivisionName;
    @Column(name = "division_id") private Long divisionId;
    @Enumerated(EnumType.STRING) @Column private Format format;
    @Enumerated(EnumType.STRING) @Column private Gender gender;
    @Column(name = "league_code", nullable = false) private String leagueCode;
    @Column(nullable = false) private String season;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "last_update") private LocalDateTime lastUpdate;

    /** Initializes persistence timestamps. */
    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdate = createdAt;
    }

    /** Refreshes the modification timestamp. */
    @PreUpdate
    public void onUpdate() {
        lastUpdate = LocalDateTime.now();
    }

    /** Derives whether every Blockout classification component is present. */
    public boolean isMapped() {
        return divisionId != null && format != null && gender != null;
    }
}
