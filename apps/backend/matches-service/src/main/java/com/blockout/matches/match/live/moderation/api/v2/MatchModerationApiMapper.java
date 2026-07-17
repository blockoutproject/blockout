package com.blockout.matches.match.live.moderation.api.v2;

import com.blockout.matches.generated.model.MatchLiveModerationSummary;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationView;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchModerationApiMapper {

    MatchLiveModerationSummary toResponse(MatchLiveModerationView view);
}
