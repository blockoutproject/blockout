package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolDTO {
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
