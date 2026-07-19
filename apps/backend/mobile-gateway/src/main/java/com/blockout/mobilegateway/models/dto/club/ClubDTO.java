package com.blockout.mobilegateway.models.dto.club;

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

    private String rawName;

    private String name;

    private String address;

    private String city;

    private String postalCode;

    private String email;

    private String phoneNumber;

    private String website;

    private String logoUrl;

    private Double latitude;

    private Double longitude;

    private boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
