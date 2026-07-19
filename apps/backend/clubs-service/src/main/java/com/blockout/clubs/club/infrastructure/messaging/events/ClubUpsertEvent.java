package com.blockout.clubs.club.infrastructure.messaging.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Compact lifecycle projection consumed by the existing search worker.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubUpsertEvent {
    private String id;
    private String name;
    private String logoUrl;
    private String city;
}
