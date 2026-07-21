package com.blockout.reports.report.application.views;

import java.util.List;

public record IssueDraft(String title, String body, List<String> labels) {
}
