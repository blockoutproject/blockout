package com.blockout.mobilegateway.models.dto.notification;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPageDTO {
    private List<UserNotificationDTO> notifications;

    @JsonProperty("has_next")
    private boolean hasNext;

    @JsonProperty("next_page")
    private Integer nextPage;
}