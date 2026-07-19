package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolUpdateDTO {

    private String poolCode;

    private String leagueCode;

    private String season;

    private String leagueName;

    private String rawName;

    private String name;

    private String shortName;

    private Long divisionId;

    private Format format;

    private Gender gender;

    private Boolean active;
}