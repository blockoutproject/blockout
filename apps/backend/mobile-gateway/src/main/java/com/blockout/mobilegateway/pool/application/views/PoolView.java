package com.blockout.mobilegateway.pool.application.views;

import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.team.application.views.TeamWithStatsView;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolView {

    private Long id;

    private String season;

    private String poolCode;

    private String leagueCode;

    private String leagueName;

    private String name;

    private String shortName;

    private String rawName;

    private Format format;

    private Gender gender;

    private Long followersCount;

    private List<TeamWithStatsView> ranking;

    private DivisionView division;
}
