package com.blockout.mobilegateway.models.dto.user;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomUserUpdateDTO {
    private String pseudo;
    private String pictureUrl;
}
