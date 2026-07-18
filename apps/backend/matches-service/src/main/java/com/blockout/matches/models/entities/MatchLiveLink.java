package com.blockout.matches.models.entities;

import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "match_live_links")
@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Column(name = "owner_auth0_id", nullable = false, length = 255)
    private String ownerAuth0Id;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 32)
    private LiveProvider provider;

    @Column(name = "url", nullable = false, length = 1024)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private LiveLinkStatus status;

    @Builder.Default
    @Column(name = "report_count", nullable = false)
    private int reportCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_update")
    private Instant lastUpdate;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        lastUpdate = now;
    }

    @PreUpdate
    public void preUpdate() {
        lastUpdate = Instant.now();
    }
}
