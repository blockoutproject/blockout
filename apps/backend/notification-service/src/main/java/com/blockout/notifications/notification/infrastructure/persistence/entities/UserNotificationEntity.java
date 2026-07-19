package com.blockout.notifications.notification.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.fasterxml.jackson.databind.JsonNode;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_notifications", indexes = {
        @Index(name = "idx_user_notifications_user_created", columnList = "user_id, created_at DESC"),
        @Index(name = "idx_user_notifications_user_is_read", columnList = "user_id, is_read"),
        @Index(name = "idx_user_notifications_target", columnList = "target_type, target_id")
})
public class UserNotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "deep_link")
    private String deepLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 50)
    private NotificationTargetType targetType;

    @Column(name = "target_id")
    private Long targetId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private JsonNode metadata;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Builder.Default
    @Column(name = "is_opened", nullable = false)
    private Boolean isOpened = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "opened_at")
    private Instant openedAt;

    @PrePersist
    public void prePersist() {
        createdAt = Instant.now();
    }
}
