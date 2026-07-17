package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonInclude;

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

    private String poolCode;

    private String leagueCode;

    private String leagueName;

    private String name;

    private String shortName;

    private String rawName;

    private Format format;

    private Gender gender;

    private Long followersCount;

    private List<TeamWithStatsDTO> ranking;

    private DivisionDTO division;
}
