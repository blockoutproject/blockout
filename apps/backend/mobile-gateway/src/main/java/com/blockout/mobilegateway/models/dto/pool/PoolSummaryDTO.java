package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.FormatEnum;
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
    private GenderEnum gender;
    private FormatEnum format;
    private DivisionDTO division;
}
