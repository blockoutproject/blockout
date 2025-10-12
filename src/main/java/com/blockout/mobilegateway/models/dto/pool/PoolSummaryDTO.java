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

    @JsonProperty("league_name")
    public String leagueName;

    private String season;
    private Gender gender;
    private Format format;
    private DivisionDTO division;
}