package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedTeamDTO {
    private Long id;

    @JsonProperty("club_id")
    private String clubId;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("league_code")
    private String leagueCode;

    private Format format;

    private Gender gender;

    @JsonProperty("followers_count")
    private Long followersCount;

    private DivisionDTO division;

    private List<PoolDTO> pools;
}