package com.blockout.reports.services.builder;

import com.blockout.reports.models.enums.ReportType;
import com.blockout.reports.models.dto.github.GitHubIssueRequestDTO;
import com.blockout.reports.models.dto.report.ReportCreateDTO;

import java.util.ArrayList;
import java.util.List;

public class GitHubIssuePayloadBuilder {

    public GitHubIssueRequestDTO toIssue(ReportCreateDTO dto) {
        List<String> labels = new ArrayList<>();
        if (dto.getType() == ReportType.DISPLAY_BUG)
            labels.add("display bug");
        else if (dto.getType() == ReportType.DATA_ERROR)
            labels.add("data error");
        else if (dto.getType() == ReportType.LIVE)
            labels.add("live");
        else
            labels.add("other");

        StringBuilder body = new StringBuilder();

        body.append("## Contexte\n");
        kv(body, "Type", dto.getType() != null ? dto.getType().name() : null);
        kv(body, "Version app", dto.getAppVersion());
        kv(body, "ID Utilisateur", dto.getUserId());
        kv(body, "Nom Utilisateur", dto.getUserName());
        kv(body, "Écran", dto.getScreen());
        kv(body, "Device", dto.getDeviceModel());
        kv(body, "OS", dto.getOs());
        body.append("\n");

        if (notBlank(dto.getDescription())) {
            body.append("## Description\n").append(dto.getDescription()).append("\n\n");
        }

        if (dto.getAttachmentImageUrls() != null && !dto.getAttachmentImageUrls().isEmpty()) {
            body.append("## Pièces jointes\n");
            dto.getAttachmentImageUrls().stream().filter(this::notBlank)
                    .forEach(url -> body.append("![screenshot](").append(url).append(")\n"));
        }

        return GitHubIssueRequestDTO.builder()
                .title(dto.getTitle())
                .body(body.toString())
                .labels(labels)
                .build();
    }

    private void kv(StringBuilder sb, String k, String v) {
        if (notBlank(v))
            sb.append("- **").append(k).append("**: ").append(v).append("\n");
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}