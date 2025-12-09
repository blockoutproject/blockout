package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EnrichedPoolDTO {

    private Long id;

    private String season;

    @JsonProperty("pool_code")
    private String poolCode;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("league_name")
    private String leagueName;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("raw_name")
    private String rawName;

    private Format format;

    private Gender gender;

    @JsonProperty("followers_count")
    private Long followersCount;

    private List<TeamWithStatsDTO> ranking;

    private DivisionDTO division;
}