package com.blockout.search.models.docs;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClubSearchDoc {
    private String id;
    private String name;
    private String logoUrl;
    private String city;
}