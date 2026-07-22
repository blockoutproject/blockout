package com.blockout.mobilegateway.notification.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.mobilegateway.notification.application.views.NotificationPageView;
import com.blockout.mobilegateway.notification.application.views.UnreadCountView;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.NotificationPageInternalResponse;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.UnreadCountInternalResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Calls the Notification internal API through generated transport models.
 */
@Service
@RequiredArgsConstructor
public class NotificationInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final NotificationContractMapper contractMapper;

    private String baseUrl() {
        return apiClientProperties.getNotification().getUrl();
    }

    public NotificationPageView getNotifications(int page, int size) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("page", page)
            .queryParam("size", size)
            .build()
            .toUriString();

        ResponseEntity<NotificationPageInternalResponse> res = internalApiClient.get(url, NotificationPageInternalResponse.class);
        return contractMapper.toView(res.getBody());
    }

    public UnreadCountView getUnreadNotificationsCount() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("unread-count")
            .build()
            .toUriString();

        ResponseEntity<UnreadCountInternalResponse> res = internalApiClient.get(
            url,
            UnreadCountInternalResponse.class);
        return contractMapper.toResponse(res.getBody());
    }

    public void markNotificationRead(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString(), "read")
            .build()
            .toUriString();

        internalApiClient.post(url, null, Void.class);
    }

    public void markNotificationOpened(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString(), "opened")
            .build()
            .toUriString();

        internalApiClient.post(url, null, Void.class);
    }

    public void deleteNotification(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        internalApiClient.delete(url, Void.class);
    }

    public void registerPushToken(Long userId, RegisterPushTokenCommand command) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("users", userId.toString(), "push-tokens")
            .build()
            .toUriString();

        internalApiClient.post(url, contractMapper.toInternalRequest(command), Void.class);
    }
}
