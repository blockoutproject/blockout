package com.blockout.notifications.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.users.CustomUserDto;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UsersClientService {

    private static final Logger logger = LoggerFactory.getLogger(UsersClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public CustomUserDto getCurrentUser() {
        String url = apiClientProperties.getUser().getUrl() + "/me";

        logger.info("Calling getCurrentUser", keyValue("url", url));

        ResponseEntity<CustomUserDto> response = apiClientService.getForward(url, CustomUserDto.class);
        return response.getBody();
    }
}