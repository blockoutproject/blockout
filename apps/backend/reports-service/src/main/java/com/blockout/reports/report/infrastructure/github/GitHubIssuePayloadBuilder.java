package com.blockout.reports.report.infrastructure.github;

import com.blockout.reports.report.application.ReportCommand;
import com.blockout.shared.model.ReportTypeEnum;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/** Builds the retained GitHub labels and Markdown inside the provider adapter. */
@Component
public class GitHubIssuePayloadBuilder {

    /** Maps Blockout report intent to the current GitHub issue request. */
    public GitHubIssueDraft toIssue(ReportCommand command) {
        List<String> labels = new ArrayList<>();
        if (command.type() == ReportTypeEnum.DISPLAY_BUG) {
            labels.add("display bug");
        } else if (command.type() == ReportTypeEnum.DATA_ERROR) {
            labels.add("data error");
        } else if (command.type() == ReportTypeEnum.LOGO) {
            labels.add("logo");
        } else if (command.type() == ReportTypeEnum.LIVE) {
            labels.add("live");
        } else {
            labels.add("other");
        }

        StringBuilder body = new StringBuilder();
        body.append("## Contexte\n");
        keyValue(body, "Type", command.type() != null ? command.type().name() : null);
        keyValue(body, "Version app", command.appVersion());
        keyValue(body, "ID Utilisateur", command.displayUserId());
        keyValue(body, "Nom Utilisateur", command.userName());
        keyValue(body, "Écran", command.screen());
        keyValue(body, "Device", command.deviceModel());
        keyValue(body, "OS", command.os());
        body.append("\n");

        if (notBlank(command.description())) {
            body.append("## Description\n").append(command.description()).append("\n\n");
        }
        if (!command.legacyAttachmentImageUrls().isEmpty()) {
            body.append("## Pièces jointes\n");
            command.legacyAttachmentImageUrls().stream()
                    .filter(this::notBlank)
                    .forEach(url -> body.append("![screenshot](").append(url).append(")\n"));
        }

        return new GitHubIssueDraft(command.title(), body.toString(), List.copyOf(labels));
    }

    /** Appends one non-blank context entry. */
    private void keyValue(StringBuilder body, String key, String value) {
        if (notBlank(value)) {
            body.append("- **").append(key).append("**: ").append(value).append("\n");
        }
    }

    /** Tests whether provider Markdown should include one value. */
    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
