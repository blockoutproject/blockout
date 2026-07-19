package com.blockout.mobilegateway.user.application;

import com.blockout.mobilegateway.user.api.models.UserResponse;
import com.blockout.mobilegateway.user.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.user.infrastructure.UserInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(UserApplicationService.class);

    private final UserInternalClient userInternalClient;

    public UserResponse updateUser(String auth0Id, UpdateUserRequest dto, MultipartFile image) {
        logger.info("Update user",
                keyValue("action", "update_user"),
                keyValue("auth0_id", auth0Id),
                keyValue("has_image", image != null),
                keyValue("has_payload", dto != null));
        return userInternalClient.updateUser(auth0Id, dto, image);
    }

    public UserResponse ensureCurrentUser() {
        logger.info("Ensure current user",
                keyValue("action", "ensure_current_user"));
        return userInternalClient.ensureCurrentUser();
    }

    public void deleteCurrentUser() {
        logger.info("Delete current user",
                keyValue("action", "delete_current_user"));
        userInternalClient.deleteCurrentUser();
    }

    public void follow(String auth0Id, String entityType, Long entityId) {
        logger.info("Follow entity",
                keyValue("action", "follow_entity"),
                keyValue("auth0_id", auth0Id),
                keyValue("entity_type", entityType),
                keyValue("entity_id", entityId));
        userInternalClient.follow(auth0Id, entityType, entityId);
    }

    public void unfollow(String auth0Id, String entityType, Long entityId) {
        logger.info("Unfollow entity",
                keyValue("action", "unfollow_entity"),
                keyValue("auth0_id", auth0Id),
                keyValue("entity_type", entityType),
                keyValue("entity_id", entityId));
        userInternalClient.unfollow(auth0Id, entityType, entityId);
    }
}