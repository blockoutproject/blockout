package com.blockout.matches.match.live.api.v2;

import com.blockout.matches.generated.model.MatchLiveLinkHistoryItem;
import com.blockout.matches.generated.model.MatchLiveLinkResult;
import com.blockout.matches.generated.model.UpsertMatchLiveLinkInternalRequest;
import com.blockout.matches.match.live.application.MatchLiveLinkHistoryItemView;
import com.blockout.matches.match.live.application.MatchLiveLinkResultView;
import com.blockout.matches.match.live.application.UpsertMatchLiveLinkCommand;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchLiveLinkApiMapper {

    default UpsertMatchLiveLinkCommand toCommand(UpsertMatchLiveLinkInternalRequest request) {
        return new UpsertMatchLiveLinkCommand(request.getUrl().toString());
    }

    MatchLiveLinkResult toResponse(MatchLiveLinkResultView view);

    MatchLiveLinkHistoryItem toResponse(MatchLiveLinkHistoryItemView view);
}
