package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequest;
import com.blockout.mobilegateway.models.dto.notification.UnreadCountDTO;
import com.blockout.mobilegateway.models.dto.notification.UserNotificationPageDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationClientService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationClientService.class);

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

        logger.info("Calling notifications#getNotifications",
                keyValue("url", url),
                keyValue("page", page),
                keyValue("size", size));

        ResponseEntity<UserNotificationPageDTO> res = apiClientService.get(url, UserNotificationPageDTO.class);
        return res.getBody();
    }

    public UnreadCountDTO getUnreadNotificationsCount() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("unread-count")
                .build()
                .toUriString();

        logger.info("Calling notifications#getUnreadCount", keyValue("url", url));

        ResponseEntity<UnreadCountDTO> res = apiClientService.get(url, UnreadCountDTO.class);
        return res.getBody();
    }

    public void markNotificationRead(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString(), "read")
                .build()
                .toUriString();

        logger.info("Calling notifications#markRead", keyValue("url", url), keyValue("id", id));

        apiClientService.post(url, null, Void.class);
    }

    public void markNotificationOpened(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString(), "opened")
                .build()
                .toUriString();

        logger.info("Calling notifications#markOpened", keyValue("url", url), keyValue("id", id));

        apiClientService.post(url, null, Void.class);
    }

    public void deleteNotification(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        logger.info("Calling notifications#delete", keyValue("url", url), keyValue("id", id));

        apiClientService.delete(url, Void.class);
    }

    public void registerPushToken(Long userId, RegisterPushTokenRequest req) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("users", userId.toString(), "push-tokens")
                .build()
                .toUriString();

        logger.info("Calling notifications#registerPushToken",
                keyValue("url", url),
                keyValue("userId", userId));

        apiClientService.post(url, req, Void.class);
    }
}