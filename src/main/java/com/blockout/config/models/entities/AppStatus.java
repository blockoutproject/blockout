package com.blockout.config.models.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

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
    @Column(nullable = false)
    private boolean maintenance = false;

    @Column(length = 1024)
    private String message;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "min_version_ios", length = 32)
    private String minVersionIos;

    @Column(name = "min_version_android", length = 32)
    private String minVersionAndroid;

    @Column(name = "store_url_ios", length = 2048)
    private String storeUrlIos;

    @Column(name = "store_url_android", length = 2048)
    private String storeUrlAndroid;

    @Column(name = "force_update_message", length = 1024)
    private String forceUpdateMessage;

    @Column(name = "last_update")
    private Instant lastUpdate;

    @PrePersist
    public void onCreate() {
        lastUpdate = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        lastUpdate = Instant.now();
    }
}