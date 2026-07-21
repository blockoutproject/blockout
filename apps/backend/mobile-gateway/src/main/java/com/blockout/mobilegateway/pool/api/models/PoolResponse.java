package com.blockout.mobilegateway.pool.api.models;

import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.team.api.models.TeamWithStatsResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PoolResponse {

    private Long id;

    private String season;

    private String poolCode;

    private String leagueCode;

    private String leagueName;

    private String name;

    private String shortName;

    private String rawName;

    private Format format;

    private Gender gender;

    private Long followersCount;

    private List<TeamWithStatsResponse> ranking;

    private DivisionResponse division;
}
