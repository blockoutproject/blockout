package com.blockout.workersearch.models.dto.pool;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pool {
    private Long id;
    private String poolCode;
    private String leagueCode;
    private Integer season;
    private String leagueName;
    private String name;
    private PoolDivisionCode divisionCode;
    private String divisionName;
    private PoolFormat format;
    private PoolGender gender;
    private String rawDivisionName;
    private Long followersCount;
    private Boolean active;
    private LocalDateTime lastUpdate;
}