package com.blockout.matches.match.live.moderation.persistence;

import com.blockout.matches.match.live.moderation.application.MatchLiveModerationView;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchLiveModerationPersistenceMapper {

    @Mapping(target = "id", source = "match.id")
    @Mapping(target = "matchCode", source = "match.matchCode")
    @Mapping(target = "leagueCode", source = "match.leagueCode")
    @Mapping(target = "poolId", source = "match.poolId")
    @Mapping(target = "teamIdA", source = "match.teamIdA")
    @Mapping(target = "teamIdB", source = "match.teamIdB")
    @Mapping(target = "matchDate", source = "match.matchDate")
    @Mapping(target = "season", source = "match.season")
    @Mapping(target = "set", source = "match.set")
    @Mapping(target = "score", source = "match.score")
    @Mapping(target = "status", source = "match.status")
    @Mapping(target = "liveCode", source = "match.liveCode")
    @Mapping(target = "lastLiveLinkId", source = "link.id")
    @Mapping(target = "lastLiveLinkStatus", source = "link.status")
    @Mapping(target = "lastLiveLinkProvider", source = "link.provider")
    @Mapping(target = "lastLiveLinkUrl", source = "link.url")
    @Mapping(target = "lastLiveLinkOwnerAuth0Id", source = "link.ownerAuth0Id")
    @Mapping(target = "lastLiveLinkCreatedAt", source = "link.createdAt")
    MatchLiveModerationView toView(Match match, MatchLiveLink link);

    default MatchStatusEnum toApplicationStatus(MatchStatus status) {
        return status == null ? null : MatchStatusEnum.fromValue(status.name());
    }

    default LiveLinkStatusEnum toApplicationStatus(LiveLinkStatus status) {
        return status == null ? null : LiveLinkStatusEnum.fromValue(status.name());
    }

    default LiveProviderEnum toApplicationProvider(LiveProvider provider) {
        return provider == null ? null : LiveProviderEnum.fromValue(provider.name());
    }
}
