package com.blockout.pools.pool.persistence;

import com.blockout.pools.pool.application.CreatePoolCommand;
import com.blockout.pools.pool.application.LegacyCreatePoolCommand;
import com.blockout.pools.pool.application.PoolView;
import com.blockout.pools.pool.application.UpdatePoolCommand;
import com.blockout.pools.shared.mapping.PoolsMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(config = PoolsMapperConfig.class)
public interface PoolPersistenceMapper {

    PoolView toView(PoolEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "followersCount", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "revision", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    PoolEntity toEntity(CreatePoolCommand command);

    @Mapping(target = "revision", ignore = true)
    PoolEntity toEntity(LegacyCreatePoolCommand command);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "followersCount", ignore = true)
    @Mapping(target = "revision", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdatePoolCommand command, @MappingTarget PoolEntity entity);
}
