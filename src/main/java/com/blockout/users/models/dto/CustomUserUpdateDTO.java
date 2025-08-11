package com.blockout.users.models.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomUserUpdateDTO {
    private Long id;
    private String pseudo;
    private String firstName;
    private String lastName;
    private String pictureUrl;
}
