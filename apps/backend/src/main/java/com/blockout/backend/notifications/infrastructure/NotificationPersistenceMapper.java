package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.notifications.application.InboxReadStore.Snapshot;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Detaches notification allowances and selected personal rows without application decisions. */
@Mapper(config = MappingConfiguration.class)
interface NotificationPersistenceMapper {
  /**
   * Detaches persisted allowances without advancing their monotone lifecycle.
   *
   * @param source current retained allowance row
   * @return immutable domain facts
   */
  @Mapping(target = "consumeResult", ignore = true)
  MatchAnnouncementFacts toDomain(MatchAnnouncementEntity source);

  /**
   * Detaches the selected personal row without performing sporting or contribution reads.
   *
   * @param source current authorized database row
   * @return scalar application input before current presentation hydration
   */
  Snapshot toSnapshot(NotificationRow source);
}
