package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.notifications.UserNotificationPageDTO;

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

    /**
     * Appelle l'endpoint GET /api/v1/notifications (pagination simple)
     * et renvoie un DTO calqué sur Matches ({ notifications, hasNext, nextPage }).
     */
    public UserNotificationPageDTO getNotifications(int page, int size) {
        String notificationsApiUrl = apiClientProperties.getNotification().getUrl();

        String url = UriComponentsBuilder
                .fromUriString(notificationsApiUrl)
                .queryParam("page", page)
                .queryParam("size", size)
                .build()
                .toUriString();

        logger.info("Calling getNotifications",
                keyValue("url", url),
                keyValue("page", page),
                keyValue("size", size));

        ResponseEntity<UserNotificationPageDTO> response = apiClientService.get(url, UserNotificationPageDTO.class);
        return response.getBody();
    }
}