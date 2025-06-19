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

    @Column(name = "raw_division_name")
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

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isMapped() {
        return divisionCode != null && format != null && gender != null;
    }
}