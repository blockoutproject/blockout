package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequestDTO;
import com.blockout.mobilegateway.models.dto.notification.UnreadCountDTO;
import com.blockout.mobilegateway.models.dto.notification.UserNotificationPageDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class NotificationClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    private String baseUrl() {
        return apiClientProperties.getNotification().getUrl();
    }

    public UserNotificationPageDTO getNotifications(int page, int size) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("page", page)
                .queryParam("size", size)
                .build()
                .toUriString();

        ResponseEntity<UserNotificationPageDTO> res = apiClientService.get(url, UserNotificationPageDTO.class);
        return res.getBody();
    }

    public UnreadCountDTO getUnreadNotificationsCount() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("unread-count")
                .build()
                .toUriString();

        ResponseEntity<UnreadCountDTO> res = apiClientService.get(url, UnreadCountDTO.class);
        return res.getBody();
    }

    public void markNotificationRead(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString(), "read")
                .build()
                .toUriString();

        apiClientService.post(url, null, Void.class);
    }

    public void markNotificationOpened(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString(), "opened")
                .build()
                .toUriString();

        apiClientService.post(url, null, Void.class);
    }

    public void deleteNotification(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        apiClientService.delete(url, Void.class);
    }

    public void registerPushToken(Long userId, RegisterPushTokenRequestDTO req) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("users", userId.toString(), "push-tokens")
                .build()
                .toUriString();

        apiClientService.post(url, req, Void.class);
    }
}