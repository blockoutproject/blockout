package com.blockout.mobilegateway.user.api.models;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UpdateUserRequest {
    private String pseudo;
    private String pictureUrl;
}
