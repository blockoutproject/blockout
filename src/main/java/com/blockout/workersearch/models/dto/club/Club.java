package com.blockout.workersearch.models.dto.club;

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
public class Club {
    private String id;
    private String name;
    private String city;

    @JsonProperty("postal_code")
    private String postalCode;

    private String email;

    @JsonProperty("phone_number")
    private String phoneNumber;

    private String website;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;

    private Boolean active;
}