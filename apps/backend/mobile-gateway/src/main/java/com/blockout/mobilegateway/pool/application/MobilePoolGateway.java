package com.blockout.mobilegateway.pool.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public interface MobilePoolGateway {

    Snapshot find(Long id);

    Snapshot update(Long id, MobilePoolWorkflow.UpdateCommand command);

    record Snapshot(
            Long id,
            String poolCode,
            String leagueCode,
            String season,
            String leagueName,
            String rawName,
            String name,
            String shortName,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender,
            Long followersCount,
            boolean active) {
    }
}
