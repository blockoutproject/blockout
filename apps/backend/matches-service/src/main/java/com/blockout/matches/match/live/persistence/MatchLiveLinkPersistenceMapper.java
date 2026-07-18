package com.blockout.matches.match.live.persistence;

import com.blockout.matches.match.live.application.MatchLiveLinkSnapshot;
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
    MatchLiveLinkSnapshot toSnapshot(MatchLiveLink entity);

    default LiveProviderEnum toApplicationProvider(LiveProvider provider) {
        return provider == null ? null : LiveProviderEnum.fromValue(provider.name());
    }

    default LiveLinkStatusEnum toApplicationStatus(LiveLinkStatus status) {
        return status == null ? null : LiveLinkStatusEnum.fromValue(status.name());
    }

    default LiveProvider toPersistenceProvider(LiveProviderEnum provider) {
        return provider == null ? null : LiveProvider.valueOf(provider.getValue());
    }

    default LiveLinkStatus toPersistenceStatus(LiveLinkStatusEnum status) {
        return status == null ? null : LiveLinkStatus.valueOf(status.getValue());
    }
}
