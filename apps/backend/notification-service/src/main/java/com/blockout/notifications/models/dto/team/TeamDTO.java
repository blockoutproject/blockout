package com.blockout.notifications.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.blockout.notifications.models.enums.Format;
import com.blockout.notifications.models.enums.Gender;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO {
    private Long id;

    private String clubId;

    private String rawName;

    private String name;

    private String shortName;

    private String season;

    private String lastUpdate;

    private String leagueCode;

    private Long divisionId;

    private Format format;

    private Gender gender;

    private Long followersCount;

    private Boolean active;
}