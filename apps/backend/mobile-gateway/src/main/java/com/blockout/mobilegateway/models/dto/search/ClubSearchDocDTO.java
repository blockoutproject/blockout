package com.blockout.mobilegateway.models.dto.search;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClubSearchDocDTO {
    private String id;
    private String name;

    @JsonProperty("logo_url")
    private String logoUrl;
    private String city;
}
