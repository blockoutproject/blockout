package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
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

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    private Format format;

    private Gender gender;

    private String season;

    @JsonProperty("followers_count")
    private Long followersCount;

    @JsonProperty("logo_url")
    private String logoUrl;

    private DivisionDTO division;

    private List<EnrichedPoolDTO> pools;
}