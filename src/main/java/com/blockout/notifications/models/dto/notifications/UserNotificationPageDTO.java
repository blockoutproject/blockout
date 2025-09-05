package com.blockout.notifications.models.dto.notifications;

import java.util.List;

import com.blockout.notifications.models.UserNotification;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPageDTO {
    private List<UserNotification> notifications;
    private boolean hasNext;
    private Integer nextPage;
}