package com.blockout.search.models.docs;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PoolSearchDoc {
    private Long id;
    private String divisionName;
    private String name;
}