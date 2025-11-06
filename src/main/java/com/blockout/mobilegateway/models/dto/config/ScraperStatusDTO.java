package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScraperStatusDTO {

    private Long id;
    private String name;
    private boolean enabled;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}