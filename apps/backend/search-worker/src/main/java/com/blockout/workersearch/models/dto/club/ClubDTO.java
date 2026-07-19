package com.blockout.workersearch.models.dto.club;

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

    private String rawName;

    private String name;
    
    private String city;

    private String postalCode;

    private String email;

    private String phoneNumber;

    private String website;

    private String logoUrl;

    private String lastUpdate;

    private Boolean active;
}