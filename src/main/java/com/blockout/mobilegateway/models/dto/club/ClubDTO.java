package com.blockout.mobilegateway.models.dto.club;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubDTO {
    private String id;
    private String name;
    private String city;

    @JsonProperty("postal_code")
    private String postalCode;

    private String email;

    @JsonProperty("phone_number")
    private String phoneNumber;

    private String website;

    private Boolean active;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}