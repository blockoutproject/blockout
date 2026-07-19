package com.blockout.mobilegateway.config.api.models;

import java.time.LocalDateTime;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
