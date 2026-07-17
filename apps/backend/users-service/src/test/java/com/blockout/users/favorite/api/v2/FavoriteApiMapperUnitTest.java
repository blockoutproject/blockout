package com.blockout.users.favorite.api.v2;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.users.favorite.api.mappers.FavoriteApiMapper;
import com.blockout.users.favorite.application.FavoritePage;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.generated.api.UserFavoritesApi;
import com.blockout.users.generated.model.UserFavoritePageResponse;
import com.blockout.users.models.enums.EntityType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

/** Verifies generated favorite transport mapping and canonical serialization. */
@DisplayName("Favorite API mapper")
class FavoriteApiMapperUnitTest {

    private final FavoriteApiMapper mapper = Mappers.getMapper(FavoriteApiMapper.class);

    /** Proves the v2 controller is bound to the generated favorite interface. */
    @Test
    @DisplayName("implements the generated favorite interface")
    void implementsGeneratedFavoriteInterface() {
        assertThat(UserFavoritesApi.class).isAssignableFrom(UserFavoriteV2Controller.class);
    }

    /** Proves reduced summaries and exact page metadata cross the boundary. */
    @Test
    @DisplayName("maps canonical summaries and pagination")
    void mapsCanonicalSummariesAndPagination() {
        FavoritePage page = new FavoritePage(
                List.of(new FavoriteView(
                        5L, EntityType.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"))),
                0,
                25,
                1,
                false);

        UserFavoritePageResponse response = mapper.toResponse(page);

        assertThat(response.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getEntityType()).isEqualTo(EntityTypeEnum.TEAM);
            assertThat(item.getEntityId()).isEqualTo(11L);
        });
        assertThat(response.getPageInfo().getPage()).isZero();
        assertThat(response.getPageInfo().getPageSize()).isEqualTo(25);
        assertThat(response.getPageInfo().getTotalItems()).isEqualTo(1);
        assertThat(response.getPageInfo().getHasNext()).isFalse();
    }

    /** Proves generated v2 fields stay camelCase under the temporary global snake mapper. */
    @Test
    @DisplayName("keeps canonical camelCase serialization")
    void keepsCanonicalCamelCaseSerialization() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        FavoritePage page = new FavoritePage(
                List.of(new FavoriteView(5L, EntityType.POOL, 13L, null)), 0, 25, 1, false);

        String body = objectMapper.writeValueAsString(mapper.toResponse(page));

        assertThat(body).contains("\"entityType\"", "\"entityId\"", "\"pageInfo\"", "\"pageSize\"", "\"totalItems\"");
        assertThat(body).doesNotContain("entity_type", "entity_id", "page_info", "page_size", "total_items");
    }
}
