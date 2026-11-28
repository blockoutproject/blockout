package com.blockout.backend.notifications.application;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.notifications.application.InboxReadStore.Snapshot;
import com.blockout.backend.notifications.application.InboxViews.Entry;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mechanical inbox representation after the application resolves current sporting and link facts.
 */
@Mapper(config = MappingConfiguration.class)
public interface InboxViewMapper {
  /**
   * Combines one admitted scalar row with already resolved current owner facts.
   *
   * @param source current selected personal row
   * @param match currently permitted sporting summary
   * @param publicLink current active contribution presence, without a video address
   * @return detached current inbox entry with stable personal facts
   */
  @Mapping(target = "id", source = "source.id")
  Entry toView(Snapshot source, MatchSummary match, boolean publicLink);
}
