package com.blockout.users.models.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomUserUpdateDTO {
    private String pseudo;
    private String pictureUrl;
}
