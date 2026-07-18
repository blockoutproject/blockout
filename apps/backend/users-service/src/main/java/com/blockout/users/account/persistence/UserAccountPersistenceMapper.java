package com.blockout.users.account.persistence;

import com.blockout.users.account.application.NewUserAccount;
import com.blockout.users.account.application.UserAccountView;
import com.blockout.users.favorite.persistence.FavoritePersistenceMapper;
import com.blockout.users.shared.mapping.UsersMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps between persistence-owned account entities and role-owned application records. */
@Mapper(config = UsersMapperConfig.class, uses = FavoritePersistenceMapper.class)
public interface UserAccountPersistenceMapper {

    UserAccountView toView(UserAccountEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "favorites", ignore = true)
    UserAccountEntity toEntity(NewUserAccount account);
}
