package com.blockout.clubs.club.api.v2;

import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.club.application.CreateClubCommand;
import com.blockout.clubs.club.application.UpdateClubCommand;
import com.blockout.clubs.generated.model.ClubInternalResponse;
import com.blockout.clubs.generated.model.CreateClubInternalRequest;
import com.blockout.clubs.generated.model.UpdateClubInternalRequest;
import com.blockout.clubs.shared.mapping.ClubsMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ClubsMapperConfig.class)
public interface ClubApiMapper {

    CreateClubCommand toCommand(CreateClubInternalRequest request);

    UpdateClubCommand toCommand(UpdateClubInternalRequest request);

    ClubInternalResponse toResponse(ClubView view);
}
