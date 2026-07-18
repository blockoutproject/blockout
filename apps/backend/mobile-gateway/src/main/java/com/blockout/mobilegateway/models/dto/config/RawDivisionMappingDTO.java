package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
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

    private FormatEnum format;
    private GenderEnum gender;

    private String leagueCode;

    private String season;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
