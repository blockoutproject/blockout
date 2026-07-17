package com.blockout.matches.match.live.report.api.v2;

import com.blockout.matches.generated.model.ReportMatchLiveLinkInternalRequest;
import com.blockout.matches.match.live.report.application.ReportMatchLiveLinkCommand;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchLiveLinkReportApiMapper {

    default ReportMatchLiveLinkCommand toCommand(
            ReportMatchLiveLinkInternalRequest request,
            String reporterAuth0Id) {
        return new ReportMatchLiveLinkCommand(request.getReason(), reporterAuth0Id);
    }
}
