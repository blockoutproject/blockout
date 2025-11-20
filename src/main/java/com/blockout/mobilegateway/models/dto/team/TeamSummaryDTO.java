package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.enums.Gender;
import com.blockout.mobilegateway.models.enums.Format;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSummaryDTO {
    private Long id;
    private String name;
    private String season;
    private Gender gender;
    private Format format;

    @JsonProperty("logo_url")
    private String logoUrl;

    private DivisionDTO division;

    @JsonProperty("short_name")
    private String shortName;
}