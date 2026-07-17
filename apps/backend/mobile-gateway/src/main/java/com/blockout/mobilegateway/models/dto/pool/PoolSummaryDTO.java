package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.enums.Gender;
import com.blockout.mobilegateway.models.enums.Format;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolSummaryDTO {
    private Long id;
    private String name;

    private String shortName;

    public String leagueName;

    public String leagueCode;

    private String season;
    private Gender gender;
    private Format format;
    private DivisionDTO division;
}
