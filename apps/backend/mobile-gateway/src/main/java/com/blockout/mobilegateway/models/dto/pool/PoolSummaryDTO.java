package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.enums.Gender;
import com.blockout.mobilegateway.models.enums.Format;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolSummaryDTO {
    private Long id;
    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("league_name")
    public String leagueName;

    @JsonProperty("league_code")
    public String leagueCode;

    private String season;
    private Gender gender;
    private Format format;
    private DivisionDTO division;
}