package com.blockout.config.division.infrastructure.persistence.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Persistence-only representation of the division table. */
@Entity
@Table(name = "division", uniqueConstraints = @UniqueConstraint(columnNames = "name", name = "uix_division"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DivisionEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String name;
    @Column(name = "main_color", nullable = false) private String mainColor;
    @Column(name = "first_gradient_color", nullable = false) private String firstGradientColor;
    @Column(name = "second_gradient_color", nullable = false) private String secondGradientColor;
    @Column(name = "third_gradient_color", nullable = false) private String thirdGradientColor;
    @Column(name = "logo_url") private String logoUrl;
    @Column(nullable = false) private Boolean active;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "last_update") private LocalDateTime lastUpdate;

    /** Initializes persistence timestamps. */
    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdate = createdAt;
    }

    /** Refreshes the modification timestamp. */
    @PreUpdate
    public void onUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
