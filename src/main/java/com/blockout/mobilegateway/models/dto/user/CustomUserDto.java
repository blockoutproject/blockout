package com.blockout.mobilegateway.models.dto.user;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CustomUserDto {
    private Long id;
    private String auth0Id;
    private String email;
    private String pseudo;
    private String firstName;
    private String lastName;
    private String pictureUrl;
    private String phoneNumber;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdate;
    private List<UserFavoriteDto> favorites;
}