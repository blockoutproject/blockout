package com.blockout.notifications.push.persistence;

import com.blockout.shared.model.DevicePlatformEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Owns the retained push_tokens row shape inside token persistence. */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity(name = "PushToken")
@Table(name = "push_tokens", uniqueConstraints = {
        @UniqueConstraint(name = "uix_push_tokens_token", columnNames = {"expo_push_token"})
})
public class PushTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "expo_push_token", nullable = false, columnDefinition = "TEXT")
    private String expoPushToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 20)
    private DevicePlatformEnum platform;

    @Column(name = "device_id")
    private String deviceId;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_update", nullable = false)
    private LocalDateTime lastUpdate;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
        if (active == null) {
            active = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
