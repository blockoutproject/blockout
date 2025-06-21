package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.enums.DivisionCode;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolDTO {
    private Long id;

    @JsonProperty("pool_code")
    private String poolCode;

    @JsonProperty("league_code")
    private String leagueCode;

    private Integer season;

    @JsonProperty("league_name")
    private String leagueName;

    private String name;

    @JsonProperty("division_code")
    private DivisionCode divisionCode;

    private Format format;

    private Gender gender;

    @JsonProperty("followers_count")
    private Long followersCount;

    private Boolean active;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}