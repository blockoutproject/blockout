package com.blockout.notifications.inbox.api.v2;

import com.blockout.notifications.generated.api.NotificationInboxPagesApi;
import com.blockout.notifications.generated.model.NotificationInternalPageResponse;
import com.blockout.notifications.inbox.application.NotificationInboxPage;
import com.blockout.notifications.inbox.application.NotificationInboxQuery;
import com.blockout.shared.model.PageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/** Implements only the generated canonical inbox-page boundary assigned to MRG-341. */
@RestController
@RequiredArgsConstructor
public class NotificationInboxV2Controller implements NotificationInboxPagesApi {

    private final NotificationInboxQuery inbox;
    private final NotificationInboxApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<NotificationInternalPageResponse> listCurrentUserNotifications(
            Integer page,
            Integer pageSize) {
        NotificationInboxPage result = inbox.listCanonical(page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext());
        return ResponseEntity.ok(new NotificationInternalPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }
}
