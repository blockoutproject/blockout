package com.blockout.config.models.dto;

import lombok.Data;

@Data
public class LegalDocumentUpdateDTO {
    private String title;
    private String version;
    private String content;
}