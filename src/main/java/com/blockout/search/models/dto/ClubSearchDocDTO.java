package com.blockout.search.models.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClubSearchDocDTO {
    private String id;
    private String name;
    private String logoUrl;
    private String city;
}