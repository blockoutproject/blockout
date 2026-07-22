package com.blockout.mobilegateway.user.infrastructure;

import com.blockout.mobilegateway.shared.application.models.EntityType;
import com.blockout.mobilegateway.user.application.commands.UpdateUserCommand;
import com.blockout.mobilegateway.user.infrastructure.contract.models.UserFavoriteSummaryInternalResponse;
import com.blockout.mobilegateway.user.infrastructure.contract.models.UserInternalResponse;
import com.blockout.shared.model.EntityTypeEnum;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class UserContractMapperUnitTest {

    private final UserContractMapper mapper = new UserContractMapper();

    @Test
    void mapsTheCompleteInternalUserToThePublicResponse() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        UserInternalResponse internal = new UserInternalResponse(1L, "auth0|1", true)
            .email("user@example.com")
            .pseudo("user")
            .firstName("First")
            .lastName("Last")
            .pictureUrl("picture")
            .phoneNumber("phone")
            .createdAt(now)
            .lastUpdate(now)
            .favorites(List.of(new UserFavoriteSummaryInternalResponse(EntityTypeEnum.TEAM, 2L)));

        var response = mapper.toResponse(internal);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.auth0Id()).isEqualTo("auth0|1");
        assertThat(response.createdAt()).isEqualTo(now);
        assertThat(response.favorites()).singleElement().satisfies(favorite -> {
            assertThat(favorite.entityType()).isEqualTo(EntityType.TEAM);
            assertThat(favorite.entityId()).isEqualTo(2L);
        });
    }

    @Test
    void mapsOnlyEditableFieldsToTheInternalRequest() {
        UpdateUserCommand request = new UpdateUserCommand("new-pseudo", "picture");

        var internal = mapper.toInternalRequest(request);

        assertThat(internal.getPseudo()).isEqualTo("new-pseudo");
        assertThat(internal.getPictureUrl()).isEqualTo("picture");
    }
}
