package com.blockout.matches.match.live.moderation.persistence;

import com.blockout.matches.match.live.moderation.application.MatchLiveModerationLinkSnapshot;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationMatchSnapshot;
import com.blockout.matches.match.live.persistence.MatchLiveLink;
import com.blockout.matches.match.persistence.Match;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveModerationPersistenceMapper {

    public MatchLiveModerationMatchSnapshot toSnapshot(Match match) {
        List<MatchLiveModerationLinkSnapshot> links = match.getLiveLinks() == null
                ? null
                : match.getLiveLinks().stream().map(this::toSnapshot).toList();
        return new MatchLiveModerationMatchSnapshot(
                match.getId(), match.getMatchCode(), match.getLeagueCode(), match.getPoolId(), match.getTeamIdA(),
                match.getTeamIdB(), match.getMatchDate(), match.getSeason(), match.getSet(), match.getScore(),
                match.getStatus() == null ? null : MatchStatusEnum.fromValue(match.getStatus().name()),
                match.getLiveCode(), links);
    }

    public MatchLiveModerationLinkSnapshot toSnapshot(MatchLiveLink link) {
        return new MatchLiveModerationLinkSnapshot(
                link.getId(), link.getMatch() == null ? null : link.getMatch().getId(),
                link.getStatus() == null ? null : LiveLinkStatusEnum.fromValue(link.getStatus().name()),
                link.getProvider() == null ? null : LiveProviderEnum.fromValue(link.getProvider().name()),
                link.getUrl(), link.getOwnerAuth0Id(), link.getCreatedAt());
    }
}
