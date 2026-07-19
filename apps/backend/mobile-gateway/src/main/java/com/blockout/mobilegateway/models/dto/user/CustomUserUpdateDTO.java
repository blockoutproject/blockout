package com.blockout.mobilegateway.models.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomUserUpdateDTO {
    private Long id;
    private String pseudo;

    @JsonProperty("first_name")
    private String firstName;

    @JsonProperty("last_name")
    private String lastName;

    @JsonProperty("picture_url")
    private String pictureUrl;
}
