package com.blockout.notifications.notification.infrastructure.http.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamInternalResponse {
    private Long id;

    private String clubId;

    private String rawName;

    private String name;

    private String shortName;

    private String season;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;

    private String leagueCode;

    private Long divisionId;

    private Format format;

    private Gender gender;

    private Long followersCount;

    private String logoUrl;

    private Boolean active;
}
