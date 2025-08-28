package com.blockout.workernotifications.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.blockout.workernotifications.models.enums.EntityType;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "followers_projection",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"entity_type", "entity_id", "user_id"},
                        name = "uix_followers_projection_entity_user")
        },
        indexes = {
                @Index(name = "idx_followers_projection_entity", columnList = "entity_type, entity_id"),
                @Index(name = "idx_followers_projection_user", columnList = "user_id")
        })
public class FollowersProjection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 16)
    private EntityType entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

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
}