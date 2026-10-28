package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Association;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Mechanical current-binding replacement; identity and optimistic revision remain owner-managed. */
@Mapper(config = MappingConfiguration.class)
interface PushSubscriptionPersistenceMapper {
  /**
   * Detaches safe metadata for the accepted resource response.
   * @param entity managed current binding
   * @return address-free ownership metadata
   */
  Association toView(PushSubscriptionEntity entity);

  /**
   * Applies all writable association fields to this original connection.
   * @param registration complete accepted intent
   * @param entity managed original target
   */
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "revision", ignore = true)
  void update(Registration registration, @MappingTarget PushSubscriptionEntity entity);
}
