package com.blockout.mobilegateway.models.dto.notification;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPageDTO {
    private List<UserNotificationDTO> notifications;

    private boolean hasNext;

    private Integer nextPage;
}
