package com.blockout.config.models.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppStatusUpdateDTO {

    private Boolean maintenance;
    private String message;

    @JsonProperty("image_url")
    private String imageUrl;
}