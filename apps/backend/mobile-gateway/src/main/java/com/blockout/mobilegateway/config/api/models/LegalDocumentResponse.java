package com.blockout.mobilegateway.config.api.models;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LegalDocumentResponse {

    private Long id;
    private String type;
    private String title;
    private String version;
    private String content;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}