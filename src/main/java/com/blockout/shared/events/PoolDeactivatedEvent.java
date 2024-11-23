package com.blockout.shared.events;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import lombok.Data;

@Data
public class PoolDeactivatedEvent implements Serializable {
    private Long poolId;
    private String timestamp;

    public PoolDeactivatedEvent(Long poolId) {
        this.poolId = poolId;
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
    }
}