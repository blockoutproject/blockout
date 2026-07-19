package com.blockout.mobilegateway.notification.api.models;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageResponse {
    private List<NotificationResponse> notifications;

    private boolean hasNext;

    private Integer nextPage;
}