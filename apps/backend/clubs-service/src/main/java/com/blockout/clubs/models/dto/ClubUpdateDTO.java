package com.blockout.clubs.models.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubUpdateDTO {

    private String id;

    private String rawName;

    private String name;

    private String city;
    private String address;

    private String postalCode;

    private String logoUrl;

    private String email;

    private String phoneNumber;

    private String website;
}