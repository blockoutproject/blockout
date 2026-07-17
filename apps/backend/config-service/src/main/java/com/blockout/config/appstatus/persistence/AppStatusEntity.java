package com.blockout.config.appstatus.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "app_status")
public class AppStatusEntity {

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
    void onCreate() {
        lastUpdate = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        lastUpdate = Instant.now();
    }
}
