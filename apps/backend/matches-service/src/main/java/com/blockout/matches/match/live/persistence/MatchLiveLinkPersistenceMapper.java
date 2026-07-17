package com.blockout.matches.match.live.persistence;

import com.blockout.matches.match.live.application.MatchLiveLinkHistoryItemView;
import com.blockout.matches.match.live.application.MatchLiveLinkResultView;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchLiveLinkPersistenceMapper {

    @Mapping(target = "matchId", source = "match.id")
    MatchLiveLinkResultView toResult(MatchLiveLink entity);

    @Mapping(target = "matchId", source = "match.id")
    MatchLiveLinkHistoryItemView toHistoryItem(MatchLiveLink entity);

    default LiveProviderEnum toApplicationProvider(LiveProvider provider) {
        return provider == null ? null : LiveProviderEnum.fromValue(provider.name());
    }

    default LiveLinkStatusEnum toApplicationStatus(LiveLinkStatus status) {
        return status == null ? null : LiveLinkStatusEnum.fromValue(status.name());
    }
}
