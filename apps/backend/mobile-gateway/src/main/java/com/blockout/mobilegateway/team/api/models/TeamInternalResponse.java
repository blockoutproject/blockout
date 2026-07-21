package com.blockout.mobilegateway.team.api.models;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
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

    private String leagueCode;

    private Long divisionId;

    private Format format;

    private Gender gender;

    private String season;

    private Long followersCount;

    private String logoUrl;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
