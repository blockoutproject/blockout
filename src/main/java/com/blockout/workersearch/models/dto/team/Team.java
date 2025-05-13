package com.blockout.workersearch.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Team {
    private Long id;
    private String clubId;
    private String name;
    private String shortName;
    private Boolean active;
    private LocalDateTime lastUpdate;
    private String leagueCode;
    private String divisionName;
    private TeamFormat format;
    private TeamGender gender;
    private Long followersCount;
}