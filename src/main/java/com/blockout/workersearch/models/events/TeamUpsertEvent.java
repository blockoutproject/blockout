package com.blockout.workersearch.models.events;

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
    private String clubId;
    private String divisionName;
    private String format;
    private String gender;
}
