package com.blockout.notifications.notification.infrastructure.http.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolInternalResponse {
    private Long id;

    private String poolCode;

    private String leagueCode;

    private String season;

    private String leagueName;

    private String rawName;

    private String name;

    private String shortName;

    private Long divisionId;

    private Format format;

    private Gender gender;

    private Long followersCount;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
