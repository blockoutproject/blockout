package com.blockout.mobilegateway.models.dto.notifications;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty("has_next")
    private boolean hasNext;

    @JsonProperty("next_page")
    private Integer nextPage;
}