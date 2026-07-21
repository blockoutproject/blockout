package com.blockout.matches.match.infrastructure.persistence.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "match_live_link_reports", uniqueConstraints = {
    @UniqueConstraint(name = "uix_live_link_reporter", columnNames = {"live_link_id", "reporter_auth0_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "live_link_id", nullable = false)
    private MatchLiveLinkEntity liveLink;

    @Column(name = "reporter_auth0_id", nullable = false, length = 255)
    private String reporterAuth0Id;

    @Column(name = "reason", length = 512)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
