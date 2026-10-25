package com.blockout.backend.notifications.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.NotificationFamilyEnum;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.NotificationSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationsResponse;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.notifications.application.InboxReadStore.Entry;
import com.blockout.backend.notifications.application.InboxReadStore.Page;
import com.blockout.backend.notifications.application.InboxReadStore.Summary;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import com.blockout.backend.sporting.application.ConsultationViews.Result;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Canonical transport mapping reuses F03 sporting DTOs and the stable F07 editorial choice. */
@Mapper(config = MappingConfiguration.class, uses = ConsultationApiMapper.class)
public interface NotificationApiMapper {
  /**
   * Maps current authorized facts into the generated notification representation.
   *
   * @param source current owner entry
   * @return current canonical notification with no video or private fields
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "title", expression = "java(text(source))")
  @Mapping(target = "division", source = "match.pool.classification.division")
  NotificationResponse toResponse(Entry source);

  /**
   * Maps the fixed announcement composition to its canonical wire value.
   *
   * @param family fixed personal composition
   * @return canonical wire family
   */
  default NotificationFamilyEnum family(NotificationFamily family) {
    return switch (family) {
      case PLAIN_RESULT -> NotificationFamilyEnum.RESULT;
      case ENRICHED_RESULT -> NotificationFamilyEnum.RESULT_WITH_LINK;
      case LIVE_LINK -> NotificationFamilyEnum.LIVE_LINK;
      case POST_RESULT_LINK -> NotificationFamilyEnum.POST_RESULT_LINK;
    };
  }

  /**
   * Preserves a known instant in UTC without inventing absent values.
   *
   * @param value retained UTC instant, or absent
   * @return equivalent UTC timestamp, or null
   */
  default OffsetDateTime instant(Instant value) {
    return value == null ? null : value.atOffset(ZoneOffset.UTC);
  }

  /**
   * Reads one current bounded inbox page.
   *
   * @param page bounded owner page
   * @return collection with continuation omitted at exhaustion
   */
  default NotificationsResponse page(Page page) {
    return new NotificationsResponse(page.entries().stream().map(this::toResponse).toList())
        .nextCursor(NotificationCursor.encode(page.next()));
  }

  /**
   * Returns the current whole-inbox aggregate.
   *
   * @param summary aggregate from one current selection
   * @return count and optional next expiry
   */
  default NotificationSummaryResponse summary(Summary summary) {
    return new NotificationSummaryResponse(summary.unreadCount())
        .nextExpiryAt(instant(summary.nextExpiryAt()));
  }

  /**
   * Renders factual French card text using the persisted editorial choice.
   *
   * @param entry current authorized sporting facts with fixed family/variant
   * @return factual French card text including corrected/absent result or link
   */
  default String text(Entry entry) {
    Result result = entry.match().result();
    return NotificationMessage.render(
            entry.family(),
            entry.variant(),
            new NotificationMessage.Facts(
                entry.match().home().name(),
                entry.match().away().name(),
                result != null && result.state() == ResultStateEnum.FINAL,
                result == null ? null : result.homeSets(),
                result == null ? null : result.awaySets(),
                result == null ? null : result.specialLabel(),
                entry.publicLink()))
        .body();
  }
}
