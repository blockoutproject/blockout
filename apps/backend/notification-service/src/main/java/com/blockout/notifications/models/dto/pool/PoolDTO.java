package com.blockout.notifications.models.dto.pool;

import com.blockout.notifications.models.enums.Format;
import com.blockout.notifications.models.enums.Gender;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolDTO {
    private Long id;

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

    private Long followersCount;

    private Boolean active;

    private String lastUpdate;
}