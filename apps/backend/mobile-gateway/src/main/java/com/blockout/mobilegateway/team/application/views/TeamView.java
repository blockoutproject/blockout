package com.blockout.mobilegateway.team.application.views;

import com.blockout.mobilegateway.club.application.views.ClubView;
import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.pool.application.views.PoolView;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamView {
    private Long id;

    private String name;

    private String clubId;

    private String shortName;

    private String rawName;

    private Format format;

    private Gender gender;

    private String season;

    private Long followersCount;

    private String logoUrl;

    private ClubView club;

    private DivisionView division;

    private List<PoolView> pools;
}
