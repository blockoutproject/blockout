package com.blockout.config.scraperstatus.infrastructure.persistence.entities;

import com.blockout.config.scraperstatus.application.models.ScraperName;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Persistence-only representation of the scraper_status table. */
@Entity
@Table(name = "scraper_status")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScraperStatusEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false, unique = true) private ScraperName name;
    @Column(nullable = false) private boolean enabled;
    @Column(name = "last_update") private LocalDateTime lastUpdate;

    /** Refreshes the modification timestamp on insert and update. */
    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        lastUpdate = LocalDateTime.now();
    }
}
