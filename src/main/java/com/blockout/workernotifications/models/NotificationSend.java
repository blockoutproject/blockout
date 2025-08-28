package com.blockout.workernotifications.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.blockout.workernotifications.models.enums.NotificationStatus;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notification_send", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "match_id" }, name = "uix_notification_send_user_match")
}, indexes = {
        @Index(name = "idx_notification_send_match", columnList = "match_id"),
        @Index(name = "idx_notification_send_status", columnList = "status"),
        @Index(name = "idx_notification_send_user", columnList = "user_id")
})
public class NotificationSend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private NotificationStatus status; // défaut DB: PENDING

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
        // Si l'app passe null, on s'aligne sur la valeur par défaut DB 'PENDING'
        if (status == null) {
            status = NotificationStatus.PENDING;
        }
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}