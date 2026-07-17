package com.blockout.mobilegateway.notification.api;

import com.blockout.mobilegateway.generated.api.MobileNotificationsApi;
import com.blockout.mobilegateway.generated.model.MobileNotification;
import com.blockout.mobilegateway.generated.model.MobileNotificationPageResponse;
import com.blockout.mobilegateway.generated.model.MobileUnreadNotificationCount;
import com.blockout.mobilegateway.generated.model.RegisterMobilePushTokenRequest;
import com.blockout.mobilegateway.notification.application.MobileNotificationWorkflow;
import com.blockout.shared.model.PageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MobileNotificationV2Controller implements MobileNotificationsApi {

    private final MobileNotificationWorkflow workflow;

    @Override
    public ResponseEntity<MobileNotificationPageResponse> listMobileNotifications(Integer page, Integer pageSize) {
        var result = workflow.list(page, pageSize);
        var items = result.items().stream()
                .map(item -> new MobileNotification(
                        item.id(), item.title(), item.body(), item.deepLink(), item.createdAt(), item.divisionLogoUrl()))
                .toList();
        return ResponseEntity.ok(new MobileNotificationPageResponse(
                items, new PageInfo(result.page(), result.pageSize(), result.hasNext()).totalItems(result.totalItems())));
    }

    @Override
    public ResponseEntity<MobileUnreadNotificationCount> getMobileUnreadNotificationCount() {
        return ResponseEntity.ok(new MobileUnreadNotificationCount(workflow.unreadCount()));
    }

    @Override
    public ResponseEntity<Void> markMobileNotificationRead(Long id) {
        workflow.markRead(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> markMobileNotificationOpened(Long id) {
        workflow.markOpened(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deleteMobileNotification(Long id) {
        workflow.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> registerMobilePushToken(Long userId, RegisterMobilePushTokenRequest request) {
        workflow.register(userId, new MobileNotificationWorkflow.PushTokenCommand(
                request.getExpoPushToken(), request.getPlatform(), request.getDeviceId()));
        return ResponseEntity.accepted().build();
    }
}
