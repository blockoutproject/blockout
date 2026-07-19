package com.blockout.reports.shared.application.exceptions;

public class ReportNotFoundException extends RuntimeException {
    public ReportNotFoundException(String id) {
        super("Report not found with id " + id);
    }
}
