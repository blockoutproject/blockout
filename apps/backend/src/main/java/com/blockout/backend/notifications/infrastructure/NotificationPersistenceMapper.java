package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.notifications.application.InboxReadStore.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Detaches notification facts after their stores have selected and hydrated current owners. */
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
   * Combines the selected personal row with already resolved current public facts.
   *
   * @param source current authorized row
   * @param match current sporting summary
   * @param publicLink whether an eligible public contribution currently exists
   * @return detached inbox presentation facts
   */
  @Mapping(target = "id", source = "source.id")
  Entry toView(NotificationRow source, MatchSummary match, boolean publicLink);
}
