package com.blockout.mobilegateway.report.api;

import com.blockout.mobilegateway.api.models.CreateReportRequest;
import com.blockout.mobilegateway.api.models.ReportResponse;
import com.blockout.mobilegateway.report.application.commands.CreateReportCommand;
import com.blockout.mobilegateway.report.application.views.ReportView;
import com.blockout.mobilegateway.shared.application.models.ReportType;
import org.springframework.stereotype.Component;

/** Maps Report application data to the generated mobile API contract. */
@Component
public class ReportApiMapper {

    public CreateReportCommand toCommand(CreateReportRequest source) {
        return new CreateReportCommand(
            ReportType.valueOf(source.getType().name()), source.getTitle(), source.getDescription(),
            source.getAppVersion(), source.getUserId(), source.getUserName(), source.getScreen(),
            source.getDeviceModel(), source.getOs(), source.getAttachmentImageUrls());
    }

    public ReportResponse toResponse(ReportView source) {
        return new ReportResponse(source.id(), source.number(), source.htmlUrl(), source.title(), source.state());
    }
}
