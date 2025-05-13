package com.blockout.workersearch.models.dto.club;

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
    private String postalCode;
    private String email;
    private String phoneNumber;
    private String website;
    private LocalDateTime lastUpdate;
    private Boolean active;
}