package com.blockout.shared.events;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import lombok.Data;

@Data
public class TeamDeactivatedEvent implements Serializable {
    private Long teamId;
    private String timestamp;

    public TeamDeactivatedEvent(Long teamId) {
        this.teamId = teamId;
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
    }
}