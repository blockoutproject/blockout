package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.user.CustomUserDTO;
import com.blockout.mobilegateway.models.dto.user.CustomUserUpdateDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserClientService {

    private static final Logger logger = LoggerFactory.getLogger(UserClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getUser().getUrl();
    }

    public CustomUserDTO updateUser(String auth0Id, CustomUserUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(auth0Id)
                .build()
                .toUriString();

        logger.info("Calling user#update",
                keyValue("action", "call_user_update"),
                keyValue("auth0Id", auth0Id),
                keyValue("url", url));

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<CustomUserDTO> response = apiClientService.putMultipart(url, body, CustomUserDTO.class);
        return response.getBody();
    }

    public CustomUserDTO ensureCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("me")
                .build()
                .toUriString();

        logger.info("Calling user#ensureCurrentUser",
                keyValue("action", "call_user_ensure_current"),
                keyValue("url", url));

        ResponseEntity<CustomUserDTO> response = apiClientService.put(url, null, CustomUserDTO.class);
        return response.getBody();
    }

    public void deleteCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("me")
                .build()
                .toUriString();

        logger.info("Calling user#deleteCurrentUser",
                keyValue("action", "call_user_delete_current"),
                keyValue("url", url));

        apiClientService.delete(url, Void.class);
    }

    public void follow(String auth0Id, String entityType, Long entityId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("favorites", "follow")
                .queryParam("entity_type", entityType)
                .queryParam("entity_id", entityId)
                .build()
                .toUriString();

        logger.info("Calling user#follow",
                keyValue("auth0Id", auth0Id),
                keyValue("entityType", entityType),
                keyValue("entityId", entityId),
                keyValue("url", url));

        apiClientService.post(url, null, Void.class);
    }

    public void unfollow(String auth0Id, String entityType, Long entityId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("favorites", "follow")
                .queryParam("entity_type", entityType)
                .queryParam("entity_id", entityId)
                .build()
                .toUriString();

        logger.info("Calling user#unfollow",
                keyValue("auth0Id", auth0Id),
                keyValue("entityType", entityType),
                keyValue("entityId", entityId),
                keyValue("url", url));

        apiClientService.delete(url, Void.class);
    }
}