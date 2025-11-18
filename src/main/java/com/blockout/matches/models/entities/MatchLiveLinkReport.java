package com.blockout.matches.models.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "match_live_link_reports", uniqueConstraints = {
        @UniqueConstraint(name = "uix_live_link_reporter", columnNames = { "live_link_id", "reporter_auth0_id" })
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_link_id", nullable = false)
    private Long liveLinkId;

    @Column(name = "reporter_auth0_id", nullable = false)
    private String reporterAuth0Id;

    @Column(name = "reason")
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}