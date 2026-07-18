package com.blockout.workersearch.models.events;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

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
    private FormatEnum format;
    private GenderEnum gender;
    private String season;
    private String logoUrl;
}
