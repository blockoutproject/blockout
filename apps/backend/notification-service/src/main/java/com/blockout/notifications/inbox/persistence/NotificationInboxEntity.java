package com.blockout.notifications.inbox.persistence;

import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Owns the retained user_notifications row shape inside the inbox persistence adapter. */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity(name = "UserNotification")
@Table(name = "user_notifications", indexes = {
        @Index(name = "idx_user_notifications_user_created", columnList = "user_id, created_at DESC"),
        @Index(name = "idx_user_notifications_user_is_read", columnList = "user_id, is_read"),
        @Index(name = "idx_user_notifications_target", columnList = "target_type, target_id")
})
public class NotificationInboxEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationTypeEnum type;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "deep_link")
    private String deepLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 50)
    private NotificationTargetTypeEnum targetType;

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
