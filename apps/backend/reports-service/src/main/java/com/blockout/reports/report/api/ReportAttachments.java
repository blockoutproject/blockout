package com.blockout.reports.report.api;

import com.blockout.reports.report.application.ReportAttachment;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

/** Maps multipart transport inputs immediately to application-owned attachments. */
@UtilityClass
public class ReportAttachments {

    /** Materializes optional multipart inputs without leaking Spring types downstream. */
    public static List<ReportAttachment> from(List<MultipartFile> files) throws IOException {
        if (files == null) {
            return List.of();
        }
        List<ReportAttachment> attachments = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file != null) {
                attachments.add(new ReportAttachment(
                        file.getOriginalFilename(), file.getContentType(), file.getSize(), file.getBytes()));
            }
        }
        return List.copyOf(attachments);
    }
}
