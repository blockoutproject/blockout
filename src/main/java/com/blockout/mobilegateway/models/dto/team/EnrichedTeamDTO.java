package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
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

    @JsonProperty("followers_count")
    private Long followersCount;

    private DivisionDTO division;

    private ClubDTO club;

    private List<EnrichedPoolDTO> pools;
}