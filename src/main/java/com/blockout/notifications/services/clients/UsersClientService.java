package com.blockout.notifications.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.users.CustomUserDTO;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UsersClientService {

    private static final Logger logger = LoggerFactory.getLogger(UsersClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public CustomUserDTO getCurrentUser() {
        String url = apiClientProperties.getUser().getUrl() + "/me";

        logger.info("Calling getCurrentUser", keyValue("url", url));

        ResponseEntity<CustomUserDTO> response = apiClientService.getForward(url, CustomUserDTO.class);
        return response.getBody();
    }
}