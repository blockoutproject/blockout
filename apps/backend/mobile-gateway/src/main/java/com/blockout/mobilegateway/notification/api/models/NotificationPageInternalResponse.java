package com.blockout.mobilegateway.notification.api.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageInternalResponse {
    private List<NotificationInternalResponse> notifications;

    private boolean hasNext;

    private Integer nextPage;
}
