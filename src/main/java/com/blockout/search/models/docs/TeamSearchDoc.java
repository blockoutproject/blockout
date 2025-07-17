package com.blockout.search.models.docs;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TeamSearchDoc {
    private Long id;
    private String name;
    private String clubId;
    private String clubName;
    private String clubCity;
    private String logoUrl;
    private String divisionName;
    private String format;
    private String gender;
}