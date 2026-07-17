package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;

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

    private LocalDateTime lastUpdate;
}
