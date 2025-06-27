package com.blockout.config.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.blockout.config.models.enums.Format;
import com.blockout.config.models.enums.Gender;
import com.blockout.config.models.enums.DivisionCode;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "raw_division_mapping", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "raw_division_name", "league_code", "season" }, name = "uix_raw_division_mapping")
})
public class RawDivisionMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "raw_division_name", nullable = false)
    private String rawDivisionName;

    @Enumerated(EnumType.STRING)
    @Column(name = "division_code")
    private DivisionCode divisionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "format")
    private Format format;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;

    @Column(name = "league_code", nullable = false)
    private String leagueCode;

    @Column(name = "season", nullable = false)
    private Integer season;

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

    public boolean isMapped() {
        return divisionCode != null && format != null && gender != null;
    }
}