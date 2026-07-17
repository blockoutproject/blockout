package com.blockout.reports.report.application;

import com.blockout.shared.model.ReportTypeEnum;
import java.util.List;

/** Carries Blockout report intent and the isolated v1 compatibility inputs. */
public record ReportCommand(
        ReportTypeEnum type,
        String title,
        String description,
        String appVersion,
        Long userId,
        String legacyUserId,
        String userName,
        String screen,
        String deviceModel,
        String os,
        List<String> legacyAttachmentImageUrls) {

    /** Defensively owns the compatibility URL collection. */
    public ReportCommand {
        legacyAttachmentImageUrls = legacyAttachmentImageUrls == null
                ? List.of()
                : List.copyOf(legacyAttachmentImageUrls);
    }

    /** Preserves arbitrary v1 user text while keeping the canonical identifier numeric. */
    public String displayUserId() {
        return legacyUserId != null ? legacyUserId : userId == null ? null : userId.toString();
    }
}
