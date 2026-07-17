package com.blockout.reports.report.api.v2;

import com.blockout.reports.generated.model.CreateReportInternalRequest;
import com.blockout.reports.generated.model.ReportCreatedInternalResponse;
import com.blockout.reports.report.application.ReportCommand;
import com.blockout.reports.report.application.ReportResult;
import com.blockout.reports.shared.mapping.ReportsMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps generated transport models at the canonical report boundary. */
@Mapper(config = ReportsMapperConfig.class)
public interface ReportApiMapper {

    /** Maps the canonical command while leaving v1 compatibility inputs empty. */
    @Mapping(target = "legacyUserId", ignore = true)
    @Mapping(target = "legacyAttachmentImageUrls", expression = "java(java.util.List.of())")
    ReportCommand toCommand(CreateReportInternalRequest request);

    /** Projects only the approved canonical report result. */
    ReportCreatedInternalResponse toResponse(ReportResult result);
}
