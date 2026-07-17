package com.blockout.matches.match.api.v2;

import com.blockout.matches.generated.model.CreateMatchInternalRequest;
import com.blockout.matches.generated.model.MatchDayGroup;
import com.blockout.matches.generated.model.MatchDayPoolGroup;
import com.blockout.matches.generated.model.MatchDetailInternalResponse;
import com.blockout.matches.generated.model.MatchInternalResponse;
import com.blockout.matches.generated.model.UpdateMatchInternalRequest;
import com.blockout.matches.match.application.CreateMatchCommand;
import com.blockout.matches.match.application.MatchDayPoolView;
import com.blockout.matches.match.application.MatchDayView;
import com.blockout.matches.match.application.MatchDetailView;
import com.blockout.matches.match.application.MatchSnapshot;
import com.blockout.matches.match.application.UpdateMatchCommand;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchApiMapper {

    CreateMatchCommand toCommand(CreateMatchInternalRequest request);

    UpdateMatchCommand toCommand(UpdateMatchInternalRequest request);

    MatchInternalResponse toResponse(MatchSnapshot snapshot);

    MatchDetailInternalResponse toResponse(MatchDetailView view);

    MatchDayGroup toResponse(MatchDayView view);

    MatchDayPoolGroup toResponse(MatchDayPoolView view);
}
