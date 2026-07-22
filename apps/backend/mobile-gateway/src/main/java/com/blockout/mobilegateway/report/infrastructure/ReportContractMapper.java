package com.blockout.mobilegateway.report.infrastructure;

import com.blockout.mobilegateway.report.application.commands.CreateReportCommand;
import com.blockout.mobilegateway.report.application.views.ReportView;
import com.blockout.mobilegateway.report.infrastructure.contract.models.CreateReportInternalRequest;
import com.blockout.mobilegateway.report.infrastructure.contract.models.ReportInternalResponse;
import com.blockout.shared.model.ReportTypeEnum;
import org.springframework.stereotype.Component;

/**
 * Maps generated Report contracts at the gateway adapter boundary.
 */
@Component
public class ReportContractMapper {

    /**
     * Converts the public creation input to the generated internal request.
     */
    public CreateReportInternalRequest toInternalRequest(CreateReportCommand command) {
        return new CreateReportInternalRequest(
            ReportTypeEnum.valueOf(command.type().name()),
            command.title())
            .description(command.description())
            .appVersion(command.appVersion())
            .userId(command.userId())
            .userName(command.userName())
            .screen(command.screen())
            .deviceModel(command.deviceModel())
            .os(command.os())
            .attachmentImageUrls(command.attachmentImageUrls());
    }

    /**
     * Converts the generated result to an application view.
     */
    public ReportView toResponse(ReportInternalResponse report) {
        if (report == null) {
            return null;
        }
        return new ReportView(
            report.getId(), report.getNumber(), report.getHtmlUrl(), report.getTitle(), report.getState());
    }
}
