package com.blockout.config.models.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "app_status")
public class AppStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    @Column(name = "maintenance", nullable = false)
    private boolean maintenance = false;

    @Column(name = "message", length = 1024)
    private String message;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        lastUpdate = now;
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}