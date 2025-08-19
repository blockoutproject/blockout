package com.blockout.reports.services.builder;

import com.blockout.reports.models.enums.ReportType;
import com.blockout.reports.models.dto.*;
import com.blockout.reports.models.integration.github.GitHubIssueRequest;

import java.util.ArrayList;
import java.util.List;

public class GitHubIssuePayloadBuilder {

    public GitHubIssueRequest toIssue(ReportCreateDTO dto) {
        List<String> labels = new ArrayList<>();
        labels.add("report");
        labels.add("source:app");

        StringBuilder body = new StringBuilder();
        body.append("## Contexte\n");
        kv(body, "Environnement", dto.getEnvironment());
        kv(body, "Version app", dto.getAppVersion());
        kv(body, "Locale", dto.getLocale());
        kv(body, "Utilisateur", dto.getUserId());
        body.append("\n");

        if (dto.getType() == ReportType.DISPLAY_BUG && dto.getDisplayBug() != null) {
            labels.add("type:display-bug");
            DisplayBugDTO b = dto.getDisplayBug();
            body.append("## Bug d’affichage\n");
            kv(body, "Écran", b.getScreen());
            kv(body, "Device", b.getDeviceModel());
            kv(body, "OS", b.getOs());
            kv(body, "Thème", b.getUiTheme());
            kv(body, "Viewport", b.getViewport());
            body.append("\n### Reproduction\n");
            code(body, b.getStepsToReproduce());
            body.append("\n### Attendu\n");
            bullet(body, b.getExpected());
            body.append("\n### Observé\n");
            bullet(body, b.getActual());
            body.append("\n");
        }

        if (dto.getType() == ReportType.DATA_ERROR && dto.getDataError() != null) {
            labels.add("type:data-error");
            DataErrorDTO e = dto.getDataError();
            body.append("## Erreur de données\n");
            kv(body, "Référence", e.getReference());
            kv(body, "Champ", e.getField());
            kv(body, "Valeur actuelle", e.getCurrentValue());
            kv(body, "Valeur attendue", e.getExpectedValue());
            kv(body, "Source", e.getSourceLink());
            body.append("\n### Contexte\n");
            code(body, e.getContext());
            body.append("\n");
        }

        if (notBlank(dto.getDescription())) {
            body.append("## Description\n").append(dto.getDescription()).append("\n\n");
        }

        if (dto.getAttachmentImageUrls() != null && !dto.getAttachmentImageUrls().isEmpty()) {
            body.append("## Pièces jointes\n");
            dto.getAttachmentImageUrls().stream().filter(this::notBlank)
                    .forEach(url -> body.append("![screenshot](").append(url).append(")\n"));
        }

        return GitHubIssueRequest.builder()
                .title(dto.getTitle())
                .body(body.toString())
                .labels(labels)
                .build();
    }

    private void kv(StringBuilder sb, String k, String v) {
        if (notBlank(v))
            sb.append("- **").append(k).append("**: ").append(v).append("\n");
    }

    private void bullet(StringBuilder sb, String v) {
        if (notBlank(v))
            sb.append("- ").append(v).append("\n");
    }

    private void code(StringBuilder sb, String v) {
        if (notBlank(v))
            sb.append("```\n").append(v).append("\n```\n");
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}