package com.blockout.mobilegateway.notification.api.models;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageInternalResponse {
    private List<NotificationInternalResponse> notifications;

    private boolean hasNext;

    private Integer nextPage;
}