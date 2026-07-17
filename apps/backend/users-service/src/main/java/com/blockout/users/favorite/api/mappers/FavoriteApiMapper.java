package com.blockout.users.favorite.api.mappers;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.shared.model.PageInfo;
import com.blockout.users.favorite.application.FavoritePage;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.generated.model.UserFavoritePageResponse;
import com.blockout.users.generated.model.UserFavoriteSummary;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.shared.mapping.UsersMapperConfig;
import org.mapstruct.Mapper;

/** Maps generated favorite transports to application-owned enums and views. */
@Mapper(config = UsersMapperConfig.class)
public interface FavoriteApiMapper {

    /** Converts the generated shared enum at the transport boundary. */
    EntityType toApplication(EntityTypeEnum entityType);

    /** Maps one application favorite to the reduced canonical summary. */
    UserFavoriteSummary toSummary(FavoriteView favorite);

    /** Builds the generated page envelope while retaining exact count metadata. */
    default UserFavoritePageResponse toResponse(FavoritePage page) {
        PageInfo pageInfo = new PageInfo(page.page(), page.pageSize(), page.hasNext())
                .totalItems(page.totalItems());
        return new UserFavoritePageResponse(
                page.items().stream().map(this::toSummary).toList(),
                pageInfo);
    }
}
