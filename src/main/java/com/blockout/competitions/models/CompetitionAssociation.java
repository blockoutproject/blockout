package com.blockout.competitions.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "competition_association", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "pool_id", "team_id", "category" }, name = "uix_pool_team_category")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionAssociation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "club_id", nullable = false)
    private String clubId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private Category category;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(name = "points", nullable = false)
    private Integer points = 0;

    @Builder.Default
    @Column(name = "played", nullable = false)
    private Integer played = 0;

    @Builder.Default
    @Column(name = "wins", nullable = false)
    private Integer wins = 0;

    @Builder.Default
    @Column(name = "losses", nullable = false)
    private Integer losses = 0;

    @Builder.Default
    @JsonProperty("wins_3_0")
    @Column(name = "wins_3_0", nullable = false)
    private Integer wins30 = 0;

    @Builder.Default
    @JsonProperty("wins_3_1")
    @Column(name = "wins_3_1", nullable = false)
    private Integer wins31 = 0;

    @Builder.Default
    @JsonProperty("wins_3_2")
    @Column(name = "wins_3_2", nullable = false)
    private Integer wins32 = 0;

    @Builder.Default
    @JsonProperty("losses_0_3")
    @Column(name = "losses_0_3", nullable = false)
    private Integer losses03 = 0;

    @Builder.Default
    @JsonProperty("losses_1_3")
    @Column(name = "losses_1_3", nullable = false)
    private Integer losses13 = 0;

    @Builder.Default
    @JsonProperty("losses_2_3")
    @Column(name = "losses_2_3", nullable = false)
    private Integer losses23 = 0;

    @Builder.Default
    @JsonProperty("won_sets")
    @Column(name = "won_sets", nullable = false)
    private Integer wonSets = 0;

    @Builder.Default
    @JsonProperty("lost_sets")
    @Column(name = "lost_sets", nullable = false)
    private Integer lostSets = 0;

    @Builder.Default
    @JsonProperty("won_points")
    @Column(name = "won_points", nullable = false)
    private Integer wonPoints = 0;

    @Builder.Default
    @JsonProperty("lost_points")
    @Column(name = "lost_points", nullable = false)
    private Integer lostPoints = 0;

    @Builder.Default
    @JsonProperty("points_penalty")
    @Column(name = "points_penalty", nullable = false)
    private Integer pointsPenalty = 0;

    @Builder.Default
    @JsonProperty("coef_sets")
    @Column(name = "coef_sets", nullable = false)
    private Double coefSets = 0.0;

    @Builder.Default
    @JsonProperty("coef_points")
    @Column(name = "coef_points", nullable = false)
    private Double coefPoints = 0.0;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}