package com.blockout.mobilegateway.notification.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.notification.api.models.NotificationPageInternalResponse;
import com.blockout.mobilegateway.notification.api.models.RegisterPushTokenRequest;
import com.blockout.mobilegateway.notification.api.models.UnreadCountResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class NotificationInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;

    private String baseUrl() {
        return apiClientProperties.getNotification().getUrl();
    }

    public NotificationPageInternalResponse getNotifications(int page, int size) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("page", page)
            .queryParam("size", size)
            .build()
            .toUriString();

        ResponseEntity<NotificationPageInternalResponse> res = internalApiClient.get(url, NotificationPageInternalResponse.class);
        return res.getBody();
    }

    public UnreadCountResponse getUnreadNotificationsCount() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("unread-count")
            .build()
            .toUriString();

        ResponseEntity<UnreadCountResponse> res = internalApiClient.get(url, UnreadCountResponse.class);
        return res.getBody();
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

    public void registerPushToken(Long userId, RegisterPushTokenRequest req) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("users", userId.toString(), "push-tokens")
            .build()
            .toUriString();

        internalApiClient.post(url, req, Void.class);
    }
}
