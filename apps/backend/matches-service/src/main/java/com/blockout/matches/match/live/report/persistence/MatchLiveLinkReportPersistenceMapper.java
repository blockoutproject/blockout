package com.blockout.matches.match.live.report.persistence;

import com.blockout.matches.match.live.report.application.ReportMatchLiveLinkCommand;
import com.blockout.matches.match.live.persistence.MatchLiveLink;
import com.blockout.matches.models.entities.MatchLiveLinkReport;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import java.time.Instant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchLiveLinkReportPersistenceMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "liveLink", source = "liveLink")
    @Mapping(target = "reporterAuth0Id", source = "command.reporterAuth0Id")
    @Mapping(target = "reason", source = "command.reason")
    @Mapping(target = "createdAt", source = "createdAt")
    MatchLiveLinkReport toNewEntity(
            MatchLiveLink liveLink,
            ReportMatchLiveLinkCommand command,
            Instant createdAt);
}
