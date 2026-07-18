package com.blockout.notifications.delivery.persistence;

import com.blockout.shared.model.NotificationStatusEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Owns the retained notification_send row and its typed delivery identity. */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity(name = "NotificationSend")
@Table(name = "notification_send", uniqueConstraints = {
        @UniqueConstraint(
                columnNames = {"user_id", "match_id", "notification_type"},
                name = "uix_notification_send_user_match_type")
}, indexes = {
        @Index(name = "idx_notification_send_match", columnList = "match_id"),
        @Index(name = "idx_notification_send_status", columnList = "status"),
        @Index(name = "idx_notification_send_user", columnList = "user_id")
})
public class DeliveryAttemptEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 64)
    private NotificationTypeEnum notificationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private NotificationStatusEnum status;

    @Column(name = "expo_ticket_id", length = 255)
    private String expoTicketId;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "error_detail")
    private String errorDetail;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = NotificationStatusEnum.PENDING;
        }
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
