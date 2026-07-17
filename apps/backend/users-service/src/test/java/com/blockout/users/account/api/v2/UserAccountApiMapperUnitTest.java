package com.blockout.users.account.api.v2;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.users.account.application.UserAccountView;
import com.blockout.users.account.application.UserFavoriteView;
import com.blockout.users.generated.api.UserAccountsApi;
import com.blockout.users.generated.model.UserAccountInternalResponse;
import com.blockout.users.models.enums.EntityType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

/** Verifies canonical generated account mapping from the application projection. */
@DisplayName("User account API mapper")
class UserAccountApiMapperUnitTest {

    private final UserAccountApiMapper mapper = Mappers.getMapper(UserAccountApiMapper.class);

    /** Proves the canonical controller is bound to the generated account interface. */
    @Test
    @DisplayName("implements the generated account interface")
    void implementsGeneratedAccountInterface() {
        assertThat(UserAccountsApi.class).isAssignableFrom(UserAccountV2Controller.class);
    }

    /** Proves the real positive numeric local ID and reduced v2 fields cross the boundary unchanged. */
    @Test
    @DisplayName("maps the numeric local identity and canonical account fields")
    void mapsNumericLocalIdentityAndCanonicalFields() {
        Instant createdAt = Instant.parse("2026-07-01T10:00:00Z");
        UserAccountInternalResponse response = mapper.toResponse(view(createdAt));

        assertThat(response.getId()).isEqualTo(7L);
        assertThat(response.getAuth0Id()).isEqualTo("auth0|owner");
        assertThat(response.getEmail()).isEqualTo("owner@example.com");
        assertThat(response.getPseudo()).isEqualTo("owner");
        assertThat(response.getPictureUrl()).isEqualTo(URI.create("https://cdn.example/users/owner.png"));
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
        assertThat(response.getFavorites()).singleElement().satisfies(favorite -> {
            assertThat(favorite.getEntityType()).isEqualTo(EntityTypeEnum.TEAM);
            assertThat(favorite.getEntityId()).isEqualTo(11L);
        });
    }

    /** Proves generated account models retain camelCase under the temporary global snake mapper. */
    @Test
    @DisplayName("keeps canonical camelCase serialization")
    void keepsCanonicalCamelCaseSerialization() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

        String body = objectMapper.writeValueAsString(
                mapper.toResponse(view(Instant.parse("2026-07-01T10:00:00Z"))));

        assertThat(body).contains("\"auth0Id\"", "\"pictureUrl\"", "\"createdAt\"", "\"entityType\"");
        assertThat(body).doesNotContain("auth0_id", "picture_url", "created_at", "entity_type");
    }

    /** Builds one complete application projection for canonical boundary assertions. */
    private UserAccountView view(Instant createdAt) {
        return new UserAccountView(
                7L,
                "auth0|owner",
                "owner@example.com",
                "owner",
                "First",
                "Last",
                "https://cdn.example/users/owner.png",
                "+33123456789",
                true,
                createdAt,
                Instant.parse("2026-07-02T10:00:00Z"),
                List.of(new UserFavoriteView(5L, EntityType.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"))));
    }
}
