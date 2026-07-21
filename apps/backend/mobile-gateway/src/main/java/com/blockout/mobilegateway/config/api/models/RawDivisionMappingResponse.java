package com.blockout.mobilegateway.config.api.models;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingResponse {

    private Long id;

    private String rawDivisionName;

    private Long divisionId;

    private Format format;
    private Gender gender;

    private String leagueCode;

    private String season;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;

    private boolean mapped;
}
