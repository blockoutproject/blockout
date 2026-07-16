package com.blockout.mobilegateway.models.dto.config;

import lombok.Data;

@Data
public class LegalDocumentUpdateDTO {
    private String title;
    private String version;
    private String content;
}