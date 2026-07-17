package com.blockout.users.account.application;

import com.blockout.users.favorite.application.FavoritePersistenceMapper;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.shared.mapping.UsersMapperConfig;
import org.mapstruct.Mapper;

/** Maps persistence-owned account state to immutable application views. */
@Mapper(config = UsersMapperConfig.class, uses = FavoritePersistenceMapper.class)
public interface UserAccountViewMapper {

    /** Maps one persisted account to its application projection. */
    UserAccountView toView(CustomUser user);
}
