package com.blockout.mobilegateway.config.api.models;

import lombok.Data;

@Data
public class UpdateLegalDocumentRequest {
    private String title;
    private String version;
    private String content;
}