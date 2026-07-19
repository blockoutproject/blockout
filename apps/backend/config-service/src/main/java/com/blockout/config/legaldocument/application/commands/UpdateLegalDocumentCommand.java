package com.blockout.config.legaldocument.application.commands;

/** Application command for partially updating a legal document. */
public record UpdateLegalDocumentCommand(String title, String version, String content) {
}
