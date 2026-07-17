package com.blockout.config.rawmapping.persistence;

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
@Table(name = "raw_division_mapping", uniqueConstraints = @UniqueConstraint(
        columnNames = {"raw_division_name", "league_code", "season"}, name = "uix_raw_division_mapping"))
public class RawDivisionMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "raw_division_name", nullable = false)
    private String rawDivisionName;

    @Column(name = "division_id")
    private Long divisionId;

    @Enumerated(EnumType.STRING)
    private FormatEnum format;

    @Enumerated(EnumType.STRING)
    private GenderEnum gender;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(nullable = false)
    private String season;

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
