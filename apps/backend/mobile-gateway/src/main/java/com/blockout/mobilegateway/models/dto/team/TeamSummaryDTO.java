package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.FormatEnum;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSummaryDTO {
    private Long id;
    private String name;
    private String season;
    private GenderEnum gender;
    private FormatEnum format;

    private String logoUrl;

    private DivisionDTO division;

    private ClubDTO club; //TODO: a enlever

    private String shortName;
}
