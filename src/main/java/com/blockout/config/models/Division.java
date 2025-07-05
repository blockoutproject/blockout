package com.blockout.config.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "division", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "name" }, name = "uix_division")
})
public class Division {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
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
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        lastUpdate = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = LocalDateTime.now();
    }
}