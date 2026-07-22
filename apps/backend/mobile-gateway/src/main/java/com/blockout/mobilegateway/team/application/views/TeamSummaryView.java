package com.blockout.mobilegateway.team.application.views;

import com.blockout.mobilegateway.club.application.views.ClubView;
import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSummaryView {
    private Long id;
    private String name;
    private String season;
    private Gender gender;
    private Format format;

    private String logoUrl;

    private DivisionView division;

    private ClubView club;

    private String shortName;
}
