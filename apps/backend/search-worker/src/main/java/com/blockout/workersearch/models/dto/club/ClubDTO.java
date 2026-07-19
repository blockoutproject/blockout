package com.blockout.workersearch.models.dto.club;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubDTO {
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

    @JsonProperty("logo_url")
    private String logoUrl;

    @JsonProperty("last_update")
    private String lastUpdate;

    private Boolean active;
}