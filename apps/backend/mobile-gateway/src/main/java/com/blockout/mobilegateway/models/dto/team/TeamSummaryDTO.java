package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.enums.Gender;
import com.blockout.mobilegateway.models.enums.Format;
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

    private String logoUrl;

    private DivisionDTO division;

    private ClubDTO club; //TODO: a enlever

    private String shortName;
}
