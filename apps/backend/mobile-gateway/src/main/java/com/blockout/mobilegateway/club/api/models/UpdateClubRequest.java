package com.blockout.mobilegateway.club.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateClubRequest {
    private String rawName;

    private String name;

    private String address;

    private String city;

    private String postalCode;

    private String logoUrl;

    private String email;

    private String phoneNumber;

    private String website;
}
