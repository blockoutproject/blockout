package com.blockout.mobilegateway.models.dto.config;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@Setter
@Builder
public class AppStatusDTO {

    private boolean maintenance;
    private String message;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}