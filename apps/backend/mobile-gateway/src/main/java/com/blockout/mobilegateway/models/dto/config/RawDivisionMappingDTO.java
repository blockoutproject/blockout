package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingDTO {

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
