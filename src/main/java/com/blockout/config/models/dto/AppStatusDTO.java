package com.blockout.config.models.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AppStatusDTO {

    private boolean maintenance;
    private String message;
    private String imageUrl;
    private LocalDateTime lastUpdate;
}