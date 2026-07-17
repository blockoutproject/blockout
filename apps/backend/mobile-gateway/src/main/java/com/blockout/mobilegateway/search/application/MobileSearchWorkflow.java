package com.blockout.mobilegateway.search.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileSearchWorkflow {

    private final MobileSearchGateway gateway;

    public List<ClubResult> clubs(String query) {
        return gateway.clubs(query);
    }

    public List<TeamResult> teams(Filters filters) {
        return gateway.teams(filters);
    }

    public List<PoolResult> pools(Filters filters) {
        return gateway.pools(filters);
    }

    public record Filters(
            String query,
            String season,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender) {
    }

    public record ClubResult(String id, String name, String logoUrl, String city) {
    }

    public record TeamResult(
            Long id,
            String name,
            String logoUrl,
            String divisionName,
            FormatEnum format,
            GenderEnum gender,
            String season) {
    }

    public record PoolResult(
            Long id,
            String name,
            String divisionName,
            String leagueCode,
            String leagueName,
            String season,
            FormatEnum format,
            GenderEnum gender,
            String logoUrl) {
    }
}
