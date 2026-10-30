package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.niamedtech.expo.exposerversdk.request.PushNotification;
import java.util.List;
import java.util.Map;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

/** Maps only safe F07 message fields into the provider SDK's native request model. */
@Mapper(config = MappingConfiguration.class)
interface ExpoPushMapper {
  /**
   * Leaves badge, lifetime, private profiles and rich/background options absent.
   *
   * @param message current sporting text with exact original destination and routing identities
   * @return SDK-native request with no duplicated provider schema
   */
  @BeanMapping(ignoreByDefault = true)
  @Mapping(target = "to", source = "target.address", qualifiedByName = "destination")
  @Mapping(target = "title", source = "text.title")
  @Mapping(target = "body", source = "text.body")
  @Mapping(target = "data", source = "message", qualifiedByName = "routing")
  PushNotification toDto(Message message);

  /**
   * Supplies one exact destination without aggregating installations into an SDK message.
   *
   * @param address captured private Expo token
   * @return one-element SDK destination list
   */
  @Named("destination")
  default List<String> destination(String address) {
    return List.of(address);
  }

  /**
   * Aggregates only the three authorized navigation identities; these grant no access.
   *
   * @param message current original ownership and sporting destination
   * @return safe routing data with no provider or private profile metadata
   */
  @Named("routing")
  default Map<String, Object> routing(Message message) {
    return Map.of(
        "ownerAccountId",
        message.ownerAccountId().toString(),
        "notificationId",
        message.notificationId().toString(),
        "matchId",
        message.matchId().toString());
  }
}
