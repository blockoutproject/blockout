package com.blockout.reports.report.application;

import com.blockout.reports.report.application.commands.CreateReportCommand;
import com.blockout.reports.report.application.models.ReportType;
import com.blockout.reports.report.application.views.IssueDraft;

import java.util.ArrayList;
import java.util.List;

public class IssueDraftFactory {

    public IssueDraft create(CreateReportCommand command) {
        List<String> labels = new ArrayList<>();
        if (command.type() == ReportType.DISPLAY_BUG)
            labels.add("display bug");
        else if (command.type() == ReportType.DATA_ERROR)
            labels.add("data error");
        else if (command.type() == ReportType.LOGO)
            labels.add("logo");
        else if (command.type() == ReportType.LIVE)
            labels.add("live");
        else
            labels.add("other");

        StringBuilder body = new StringBuilder();

        body.append("## Contexte\n");
        kv(body, "Type", command.type() != null ? command.type().name() : null);
        kv(body, "Version app", command.appVersion());
        kv(body, "ID Utilisateur", command.userId());
        kv(body, "Nom Utilisateur", command.userName());
        kv(body, "Écran", command.screen());
        kv(body, "Device", command.deviceModel());
        kv(body, "OS", command.os());
        body.append("\n");

        if (notBlank(command.description())) {
            body.append("## Description\n").append(command.description()).append("\n\n");
        }

        if (command.attachmentImageUrls() != null && !command.attachmentImageUrls().isEmpty()) {
            body.append("## Pièces jointes\n");
            command.attachmentImageUrls().stream().filter(this::notBlank)
                    .forEach(url -> body.append("![screenshot](").append(url).append(")\n"));
        }

        return new IssueDraft(command.title(), body.toString(), labels);
    }

    private void kv(StringBuilder sb, String k, String v) {
        if (notBlank(v))
            sb.append("- **").append(k).append("**: ").append(v).append("\n");
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
