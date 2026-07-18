package com.blockout.competitions.models.events;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Retained wire type: pending v1 outbox rows and rollback images depend on this exact class name. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDeactivationEvent implements Serializable {
    private Long teamId;
}
