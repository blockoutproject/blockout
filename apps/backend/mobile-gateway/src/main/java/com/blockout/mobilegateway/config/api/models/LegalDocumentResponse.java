package com.blockout.mobilegateway.config.api.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
