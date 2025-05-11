package com.blockout.clubs.models.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubUpsertEvent {
    private String clubId;
    private String name;
    private String city;
}
