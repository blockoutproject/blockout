package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingDTO {

    private Long id;

    @JsonProperty("raw_division_name")
    private String rawDivisionName;

    @JsonProperty("division_id")
    private Long divisionId;

    private Format format;
    private Gender gender;

    @JsonProperty("league_code")
    private String leagueCode;

    private String season;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}