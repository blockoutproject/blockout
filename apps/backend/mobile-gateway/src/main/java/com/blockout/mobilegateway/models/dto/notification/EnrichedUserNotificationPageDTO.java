package com.blockout.mobilegateway.models.dto.notification;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedUserNotificationPageDTO {
    private List<EnrichedUserNotificationDTO> notifications;

    private boolean hasNext;

    private Integer nextPage;
}
