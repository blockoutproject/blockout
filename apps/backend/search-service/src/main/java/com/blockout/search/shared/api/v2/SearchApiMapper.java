package com.blockout.search.shared.api.v2;

import com.blockout.search.club.application.ClubSearchView;
import com.blockout.search.generated.model.ClubSearchInternalResult;
import com.blockout.search.generated.model.PoolSearchInternalResult;
import com.blockout.search.generated.model.TeamSearchInternalResult;
import com.blockout.search.pool.application.PoolSearchView;
import com.blockout.search.team.application.TeamSearchView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.springframework.stereotype.Component;

/** Maps application views to the intentionally narrower canonical wire projections. */
@Component
public class SearchApiMapper {

    public ClubSearchInternalResult toResponse(ClubSearchView view) {
        return new ClubSearchInternalResult(view.id(), view.name(), view.logoUrl(), view.city());
    }

    public TeamSearchInternalResult toResponse(TeamSearchView view) {
        return new TeamSearchInternalResult(
                view.id(), view.name(), view.logoUrl(), view.divisionName(),
                format(view.format()), gender(view.gender()), view.season());
    }

    public PoolSearchInternalResult toResponse(PoolSearchView view) {
        return new PoolSearchInternalResult(
                view.id(), view.name(), view.divisionName(), view.leagueCode(), view.leagueName(),
                view.season(), format(view.format()), gender(view.gender()), view.logoUrl());
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
