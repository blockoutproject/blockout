package com.blockout.clubs.club.infrastructure.messaging.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Existing cascade command requesting the soft deletion of one Club.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubDeactivationEvent implements Serializable {
    private String clubId;
}
