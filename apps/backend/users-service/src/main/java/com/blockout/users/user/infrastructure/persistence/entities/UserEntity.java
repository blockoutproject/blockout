package com.blockout.users.user.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"auth0_id"}, name = "uix_user_auth0_id"),
    @UniqueConstraint(columnNames = {"email"}, name = "uix_user_email")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auth0_id", nullable = false)
    private String auth0Id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String pseudo;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "picture_url")
    private String pictureUrl;

    @Column(name = "phone_number")
    private String phoneNumber;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<UserFavoriteEntity> favorites;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_update", nullable = false)
    private Instant lastUpdate;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
        lastUpdate = createdAt;
    }

    @PreUpdate
    void preUpdate() {
        lastUpdate = Instant.now();
    }
}
