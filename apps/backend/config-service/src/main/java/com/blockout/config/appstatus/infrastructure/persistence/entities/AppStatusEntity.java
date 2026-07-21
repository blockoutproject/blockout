package com.blockout.config.appstatus.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Persistence-only representation of the app_status table.
 */
@Entity
@Table(name = "app_status")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppStatusEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private boolean maintenance;
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

    /**
     * Initializes the modification timestamp on insert.
     */
    @PrePersist
    public void onCreate() {
        lastUpdate = Instant.now();
    }

    /**
     * Refreshes the modification timestamp on update.
     */
    @PreUpdate
    public void onUpdate() {
        lastUpdate = Instant.now();
    }
}
