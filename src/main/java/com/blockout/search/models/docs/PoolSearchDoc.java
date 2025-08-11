package com.blockout.search.models.docs;

import org.springframework.data.annotation.Id;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PoolSearchDoc {
    @Id
    private Long id;
    private String name;
    private String divisionName;
    private String leagueName;
    private String season;
    private String logoUrl;
}