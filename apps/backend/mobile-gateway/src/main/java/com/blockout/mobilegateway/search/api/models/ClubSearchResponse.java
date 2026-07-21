package com.blockout.mobilegateway.search.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubSearchResponse {
    private String id;
    private String name;
    private String logoUrl;
    private String city;
}
