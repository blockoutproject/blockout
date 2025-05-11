package com.blockout.workersearch.models.events;

import com.blockout.workersearch.models.dto.team.TeamFormat;
import com.blockout.workersearch.models.dto.team.TeamGender;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamUpsertEvent {
    private Long   teamId;
    private String name;
    private String clubId;
    private String divisionName;
    private TeamFormat format;
    private TeamGender gender;
}
