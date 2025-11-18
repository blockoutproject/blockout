package com.blockout.matches.models.dto.users;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@ToString
public class CustomUserDTO {

    private Long id;

    @JsonProperty("auth0_id")
    private String auth0Id;

    private String email;
    private String pseudo;

    @JsonProperty("first_name")
    private String firstName;

    @JsonProperty("last_name")
    private String lastName;

    @JsonProperty("picture_url")
    private String pictureUrl;

    @JsonProperty("phone_number")
    private String phoneNumber;

    private Boolean active;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;

    private List<UserFavoriteDTO> favorites;
}