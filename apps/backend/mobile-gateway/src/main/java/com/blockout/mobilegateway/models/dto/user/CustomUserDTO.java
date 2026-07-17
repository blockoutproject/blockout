package com.blockout.mobilegateway.models.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
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
    private Instant createdAt;

    @JsonProperty("last_update")
    private Instant lastUpdate;
    private List<UserFavoriteDTO> favorites;
}
