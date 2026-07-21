package com.blockout.config.division.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persistence-only representation of the division table.
 */
@Entity
@Table(name = "division", uniqueConstraints = @UniqueConstraint(columnNames = "name", name = "uix_division"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DivisionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(name = "main_color", nullable = false)
    private String mainColor;
    @Column(name = "first_gradient_color", nullable = false)
    private String firstGradientColor;
    @Column(name = "second_gradient_color", nullable = false)
    private String secondGradientColor;
    @Column(name = "third_gradient_color", nullable = false)
    private String thirdGradientColor;
    @Column(name = "logo_url")
    private String logoUrl;
    @Column(nullable = false)
    private Boolean active;
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
