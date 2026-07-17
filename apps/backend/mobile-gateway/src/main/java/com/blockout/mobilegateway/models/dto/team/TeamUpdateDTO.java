package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamUpdateDTO {

    private String clubId;

    private String rawName;

    private String name;

    private String shortName;

    private String leagueCode;

    private Long divisionId;

    private String logoUrl;

    private String season;

    private Format format;

    private Gender gender;

    private Boolean active;
}
