package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
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

    private FormatEnum format;

    private GenderEnum gender;

    private Long followersCount;

    private List<TeamWithStatsDTO> ranking;

    private DivisionDTO division;
}
