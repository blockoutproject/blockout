package com.blockout.config.legaldocument.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persistence-only representation of the legal_documents table.
 */
@Entity
@Table(name = "legal_documents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String type;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false)
    private String version;
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    /**
     * Initializes persistence timestamps.
     */
    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdate = createdAt;
    }

    /**
     * Refreshes the modification timestamp.
     */
    @PreUpdate
    public void onUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
