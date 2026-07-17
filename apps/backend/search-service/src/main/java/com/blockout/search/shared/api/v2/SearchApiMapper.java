package com.blockout.search.shared.api.v2;

import com.blockout.search.club.application.ClubSearchResult;
import com.blockout.search.generated.model.ClubSearchInternalResult;
import com.blockout.search.generated.model.PoolSearchInternalResult;
import com.blockout.search.generated.model.TeamSearchInternalResult;
import com.blockout.search.pool.application.PoolSearchResult;
import com.blockout.search.team.application.TeamSearchResult;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.springframework.stereotype.Component;

/** Maps application results to the intentionally narrower canonical wire projections. */
@Component
public class SearchApiMapper {

    public ClubSearchInternalResult toResponse(ClubSearchResult result) {
        return new ClubSearchInternalResult(result.id(), result.name(), result.logoUrl(), result.city());
    }

    public TeamSearchInternalResult toResponse(TeamSearchResult result) {
        return new TeamSearchInternalResult(
                result.id(), result.name(), result.logoUrl(), result.divisionName(),
                format(result.format()), gender(result.gender()), result.season());
    }

    public PoolSearchInternalResult toResponse(PoolSearchResult result) {
        return new PoolSearchInternalResult(
                result.id(), result.name(), result.divisionName(), result.leagueCode(), result.leagueName(),
                result.season(), format(result.format()), gender(result.gender()), result.logoUrl());
    }

    private FormatEnum format(String value) {
        if (value == null) {
            return null;
        }
        try {
            return FormatEnum.fromValue(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private GenderEnum gender(String value) {
        if (value == null) {
            return null;
        }
        try {
            return GenderEnum.fromValue(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
