package com.blockout.mobilegateway.config.api.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScraperStatusResponse {

    private Long id;
    private String name;
    private boolean enabled;

    private LocalDateTime lastUpdate;
}
