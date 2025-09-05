package com.blockout.notifications.models.dto.notifications;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UnreadCountDTO {
    private long unread;
}