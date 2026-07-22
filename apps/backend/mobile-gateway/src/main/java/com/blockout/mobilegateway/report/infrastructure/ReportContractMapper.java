package com.blockout.mobilegateway.report.infrastructure;

import com.blockout.mobilegateway.report.api.models.CreateReportRequest;
import com.blockout.mobilegateway.report.api.models.ReportResponse;
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
    public CreateReportInternalRequest toInternalRequest(CreateReportRequest request) {
        return new CreateReportInternalRequest(
            ReportTypeEnum.valueOf(request.getType().name()),
            request.getTitle())
            .description(request.getDescription())
            .appVersion(request.getAppVersion())
            .userId(request.getUserId())
            .userName(request.getUserName())
            .screen(request.getScreen())
            .deviceModel(request.getDeviceModel())
            .os(request.getOs())
            .attachmentImageUrls(request.getAttachmentImageUrls());
    }

    /**
     * Converts the generated result to the existing public response.
     */
    public ReportResponse toResponse(ReportInternalResponse report) {
        if (report == null) {
            return null;
        }
        ReportResponse response = new ReportResponse();
        response.setId(report.getId());
        response.setNumber(report.getNumber());
        response.setHtmlUrl(report.getHtmlUrl());
        response.setTitle(report.getTitle());
        response.setState(report.getState());
        return response;
    }
}
