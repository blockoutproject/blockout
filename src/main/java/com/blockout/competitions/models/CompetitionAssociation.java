package com.blockout.competitions.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "competition_association", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "pool_id", "team_id", "category" }, name = "uix_pool_team_category")
})
@Data
@Builder(toBuilder = true)
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
    @Column(name = "wins_3_to_0", nullable = false)
    private Integer wins3To0 = 0;

    @Builder.Default
    @Column(name = "wins_3_to_1", nullable = false)
    private Integer wins3To1 = 0;

    @Builder.Default
    @Column(name = "wins_3_to_2", nullable = false)
    private Integer wins3To2 = 0;

    @Builder.Default
    @Column(name = "losses_0_to_3", nullable = false)
    private Integer losses0To3 = 0;

    @Builder.Default
    @Column(name = "losses_1_to_3", nullable = false)
    private Integer losses1To3 = 0;

    @Builder.Default
    @Column(name = "losses_2_to_3", nullable = false)
    private Integer losses2To3 = 0;

    @Builder.Default
    @Column(name = "won_sets", nullable = false)
    private Integer wonSets = 0;

    @Builder.Default
    @Column(name = "lost_sets", nullable = false)
    private Integer lostSets = 0;

    @Builder.Default
    @Column(name = "won_points", nullable = false)
    private Integer wonPoints = 0;

    @Builder.Default
    @Column(name = "lost_points", nullable = false)
    private Integer lostPoints = 0;

    @Builder.Default
    @Column(name = "points_penalty", nullable = false)
    private Integer pointsPenalty = 0;

    @Builder.Default
    @Column(name = "coef_sets", nullable = false)
    private Double coefSets = 0.0;

    @Builder.Default
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