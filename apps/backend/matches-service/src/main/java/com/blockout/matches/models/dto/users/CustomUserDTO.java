package com.blockout.matches.models.dto.users;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@ToString
public class CustomUserDTO {

    private Long id;

    private String auth0Id;

    private String email;
    private String pseudo;

    private String firstName;

    private String lastName;

    private String pictureUrl;

    private String phoneNumber;

    private Boolean active;

    private Instant createdAt;

    private Instant lastUpdate;

    private List<UserFavoriteDTO> favorites;
}