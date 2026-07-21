package com.blockout.reports.report.api.mappers;

import com.blockout.reports.report.api.models.CreateReportInternalRequest;
import com.blockout.reports.report.api.models.ReportInternalResponse;
import com.blockout.reports.report.application.commands.CreateReportCommand;
import com.blockout.reports.report.application.models.ReportAttachment;
import com.blockout.reports.report.application.views.ReportView;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;

@Component
public class ReportApiMapper {

    public CreateReportCommand toCommand(CreateReportInternalRequest request, List<MultipartFile> images) {
        List<ReportAttachment> attachments = images == null
            ? Collections.emptyList()
            : images.stream().filter(image -> image != null && !image.isEmpty()).map(this::toAttachment).toList();
        return new CreateReportCommand(
            request.type(), request.title(), request.description(), request.appVersion(), request.userId(),
            request.userName(), request.screen(), request.deviceModel(), request.os(), request.attachmentImageUrls(),
            attachments);
    }

    public ReportInternalResponse toResponse(ReportView report) {
        return new ReportInternalResponse(
            report.id(), report.number(), report.htmlUrl(), report.title(), report.state());
    }

    private ReportAttachment toAttachment(MultipartFile image) {
        try {
            return new ReportAttachment(image.getOriginalFilename(), image.getContentType(), image.getBytes());
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Unable to read report image", exception);
        }
    }
}
