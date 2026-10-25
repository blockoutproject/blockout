package com.blockout.backend.notifications.api;

import com.blockout.backend.generated.mobile.api.NotificationsApi;
import com.blockout.backend.generated.mobile.model.MarkNotificationReadRequest;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.NotificationSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationsResponse;
import com.blockout.backend.notifications.application.MarkNotificationRead;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.ReadInbox;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated owner-only inbox boundary after shared F05 authentication and F12 admission. */
@RestController
@RequiredArgsConstructor
public class NotificationsController implements NotificationsApi {
  private final NotificationRequest request;
  private final HttpServletRequest http;
  private final ReadInbox reads;
  private final MarkNotificationRead marks;
  private final NotificationApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<NotificationsResponse> listNotifications(
      UUID accountId, String cursor, Boolean bypass) {
    NotificationContext owner = request.owner(accountId);
    request.validateQuery(http, true);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(reads.page(owner, NotificationCursor.decode(cursor))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<NotificationResponse> getNotification(
      UUID accountId, UUID notificationId, Boolean bypass) {
    NotificationContext owner = request.owner(accountId);
    request.validateQuery(http, false);
    return member(mapper.toDto(reads.member(owner, notificationId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<NotificationSummaryResponse> getNotificationSummary(
      UUID accountId, Boolean bypass) {
    NotificationContext owner = request.owner(accountId);
    request.validateQuery(http, false);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(reads.summary(owner)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<NotificationResponse> markNotificationRead(
      UUID accountId, UUID notificationId, MarkNotificationReadRequest body, Boolean bypass) {
    NotificationContext owner = request.owner(accountId);
    request.validateQuery(http, false);
    request.requireRead(body);
    return member(mapper.toDto(marks.mark(owner, notificationId)));
  }

  /**
   * Reads the exact current retained entry.
   *
   * @param body current canonical entry
   * @return private completed read/mark response advertising its JSON patch format
   */
  private ResponseEntity<NotificationResponse> member(NotificationResponse body) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Accept-Patch", "application/json")
        .body(body);
  }
}
