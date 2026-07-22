package com.blockout.mobilegateway.config.application.commands;

/** Values accepted when updating a legal document. */
public record UpdateLegalDocumentCommand(String title, String version, String content) {
}
