package com.blockout.notifications.team.outbound;

import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import com.blockout.notifications.team.application.TeamNameSnapshot;
import com.blockout.notifications.teamsclient.model.TeamInternalResponse;
import org.mapstruct.Mapper;

@Mapper(config = NotificationMapperConfig.class)
public interface TeamNameSnapshotMapper {

    TeamNameSnapshot toSnapshot(TeamInternalResponse response);
}
