package com.blockout.notifications.notification.infrastructure.http.models;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class UserInternalResponse {
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
    private List<UserFavoriteSummaryInternalResponse> favorites;
}
