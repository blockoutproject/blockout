package com.blockout.matches.match.application;

import com.blockout.matches.match.application.commands.CreateMatchCommand;
import com.blockout.matches.match.application.commands.UpdateMatchCommand;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.views.DayPageView;
import com.blockout.matches.match.application.views.MatchLiveSummaryView;
import com.blockout.matches.match.application.views.MatchView;

import java.util.List;

public interface MatchService {
    List<MatchView> findMatches(Long poolId, List<Long> teamIds, MatchStatus status, Boolean active);

    DayPageView getMatchesByDay(List<Long> poolIds, List<Long> teamIds, MatchStatus status,
                                int page, int size, Boolean active);

    MatchView getMatchById(Long id);

    MatchView createMatch(CreateMatchCommand command);

    MatchView updateMatch(Long id, UpdateMatchCommand command);

    void bulkDeactivateMatches(Long poolId, List<String> matchCodesToDeactivate);

    List<MatchLiveSummaryView> listMatchesForLiveModeration(LiveLinkStatus statusFilter);
}
