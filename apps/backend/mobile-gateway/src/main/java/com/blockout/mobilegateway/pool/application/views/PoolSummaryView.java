package com.blockout.mobilegateway.pool.application.views;

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
public class PoolSummaryView {
    public String leagueName;
    public String leagueCode;
    private Long id;
    private String name;
    private String shortName;
    private String season;
    private Gender gender;
    private Format format;
    private DivisionView division;
}
