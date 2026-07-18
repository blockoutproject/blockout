package com.blockout.clubs.models.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Retained v1 outbox payload type. Its class name is persisted in pending rows and is therefore compatibility state.
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
