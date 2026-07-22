package com.blockout.mobilegateway.pool.application.commands;

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
public class UpdatePoolCommand {

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
