package com.blockout.competitions.association.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "competition_association", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"pool_id", "team_id"}, name = "uix_pool_team")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionAssociationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "club_id", nullable = false)
    private String clubId;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(nullable = false)
    private Integer points = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer played = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer wins = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer losses = 0;

    @Builder.Default
    @Column(name = "wins_three_to_zero", nullable = false)
    private Integer winsThreeToZero = 0;

    @Builder.Default
    @Column(name = "wins_three_to_one", nullable = false)
    private Integer winsThreeToOne = 0;

    @Builder.Default
    @Column(name = "wins_three_to_two", nullable = false)
    private Integer winsThreeToTwo = 0;

    @Builder.Default
    @Column(name = "losses_zero_to_three", nullable = false)
    private Integer lossesZeroToThree = 0;

    @Builder.Default
    @Column(name = "losses_one_to_three", nullable = false)
    private Integer lossesOneToThree = 0;

    @Builder.Default
    @Column(name = "losses_two_to_three", nullable = false)
    private Integer lossesTwoToThree = 0;

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

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        lastUpdate = createdAt;
    }

    @PreUpdate
    void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
