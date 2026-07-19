package com.blockout.mobilegateway.team.api.models;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.shared.application.models.Format;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSummaryResponse {
    private Long id;
    private String name;
    private String season;
    private Gender gender;
    private Format format;

    private String logoUrl;

    private DivisionResponse division;

    private ClubResponse club;

    private String shortName;
}
