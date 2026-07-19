package com.blockout.mobilegateway.config.api.models;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScraperStatusResponse {

    private Long id;
    private String name;
    private boolean enabled;

    private LocalDateTime lastUpdate;
}