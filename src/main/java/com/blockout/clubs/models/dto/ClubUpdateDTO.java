package com.blockout.clubs.models.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubUpdateDTO {

    private String id;

    @JsonProperty("raw_name")
    private String rawName;

    private String name;

    private String city;

    @JsonProperty("postal_code")
    private String postalCode;

    private String email;

    @JsonProperty("phone_number")
    private String phoneNumber;

    private String website;
}