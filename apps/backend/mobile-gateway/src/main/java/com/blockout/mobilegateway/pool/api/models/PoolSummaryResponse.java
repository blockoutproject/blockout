package com.blockout.mobilegateway.pool.api.models;

import com.blockout.mobilegateway.config.api.models.DivisionResponse;
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
public class PoolSummaryResponse {
    public String leagueName;
    public String leagueCode;
    private Long id;
    private String name;
    private String shortName;
    private String season;
    private Gender gender;
    private Format format;
    private DivisionResponse division;
}
