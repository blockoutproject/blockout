package com.blockout.teams.models.events;

import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamUpsertEvent {
    private Long id;
    private String name;
    private String shortName;
    private String clubId;
    private Long divisionId;
    private Format format;
    private Gender gender;
    private String season;
    private String logoUrl;
}
