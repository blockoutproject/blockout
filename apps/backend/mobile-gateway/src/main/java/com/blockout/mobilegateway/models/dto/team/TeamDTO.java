package com.blockout.mobilegateway.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO {
    private Long id;

    private String clubId;

    private String rawName;

    private String name;

    private String shortName;

    private String leagueCode;

    private Long divisionId;

    private FormatEnum format;

    private GenderEnum gender;

    private String season;

    private Double latitude;
    
    private Double longitude;

    private Long followersCount;

    private String logoUrl;

    private Boolean active;

    private String createdAt;

    private String lastUpdate;
}
