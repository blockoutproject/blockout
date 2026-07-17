package com.blockout.mobilegateway.team.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.util.List;

public interface MobileTeamGateway {

    Snapshot find(Long id);

    List<Snapshot> listActiveByClub(String clubId);

    Snapshot update(Long id, MobileTeamWorkflow.UpdateCommand command, BinaryPart image);

    record Snapshot(
            Long id,
            String clubId,
            String rawName,
            String name,
            String shortName,
            String leagueCode,
            Long divisionId,
            String season,
            FormatEnum format,
            GenderEnum gender,
            Long followersCount,
            String logoUrl,
            boolean active) {
    }
}
