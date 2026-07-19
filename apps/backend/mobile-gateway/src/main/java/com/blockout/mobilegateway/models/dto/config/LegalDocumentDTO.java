package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LegalDocumentDTO {

    private Long id;
    private String type;
    private String title;
    private String version;
    private String content;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}