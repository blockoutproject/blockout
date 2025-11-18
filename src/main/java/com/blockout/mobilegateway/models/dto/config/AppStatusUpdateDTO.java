package com.blockout.mobilegateway.models.dto.config;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppStatusUpdateDTO {

    private Boolean maintenance;
    private String message;
    private String imageUrl;
}