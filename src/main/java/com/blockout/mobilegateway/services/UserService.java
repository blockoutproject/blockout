package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.user.CustomUserDTO;
import com.blockout.mobilegateway.models.dto.user.CustomUserUpdateDTO;
import com.blockout.mobilegateway.services.clients.UserClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserClientService userClientService;

    public CustomUserDTO updateUser(String auth0Id, CustomUserUpdateDTO dto, MultipartFile image) {
        logger.info("Update user",
                keyValue("action", "update_user"),
                keyValue("auth0_id", auth0Id),
                keyValue("has_image", image != null),
                keyValue("has_payload", dto != null));
        return userClientService.updateUser(auth0Id, dto, image);
    }

    public CustomUserDTO ensureCurrentUser() {
        logger.info("Ensure current user",
                keyValue("action", "ensure_current_user"));
        return userClientService.ensureCurrentUser();
    }

    public void deleteCurrentUser() {
        logger.info("Delete current user",
                keyValue("action", "delete_current_user"));
        userClientService.deleteCurrentUser();
    }

    public void follow(String auth0Id, String entityType, Long entityId) {
        logger.info("Follow entity",
                keyValue("action", "follow_entity"),
                keyValue("auth0_id", auth0Id),
                keyValue("entity_type", entityType),
                keyValue("entity_id", entityId));
        userClientService.follow(auth0Id, entityType, entityId);
    }

    public void unfollow(String auth0Id, String entityType, Long entityId) {
        logger.info("Unfollow entity",
                keyValue("action", "unfollow_entity"),
                keyValue("auth0_id", auth0Id),
                keyValue("entity_type", entityType),
                keyValue("entity_id", entityId));
        userClientService.unfollow(auth0Id, entityType, entityId);
    }
}