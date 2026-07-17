package com.blockout.notifications.pool.outbound;

import com.blockout.notifications.pool.application.PoolNameSnapshot;
import com.blockout.notifications.poolsclient.model.PoolInternalResponse;
import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = NotificationMapperConfig.class)
public interface PoolNameSnapshotMapper {

    PoolNameSnapshot toSnapshot(PoolInternalResponse response);
}
