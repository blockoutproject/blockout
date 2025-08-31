package com.blockout.workernotifications.models.dto.notifications;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UnreadCountDto {
    private long unread;
}