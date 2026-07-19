package com.blockout.mobilegateway.pool.api.models;

import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.shared.application.models.Format;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolSummaryResponse {
    private Long id;
    private String name;

    private String shortName;

    public String leagueName;

    public String leagueCode;

    private String season;
    private Gender gender;
    private Format format;
    private DivisionResponse division;
}