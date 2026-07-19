package com.blockout.config.division.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "division", uniqueConstraints = @UniqueConstraint(columnNames = "name", name = "uix_division"))
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

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Version
    @Column(nullable = false)
    private long revision;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}
