package com.blockout.mobilegateway.user.application;

import com.blockout.mobilegateway.user.application.commands.UpdateUserCommand;
import com.blockout.mobilegateway.user.application.views.UserView;
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

    public UserView updateUser(String auth0Id, UpdateUserCommand command, MultipartFile image) {
        logger.info("Update user",
            keyValue("action", "update_user"),
            keyValue("auth0_id", auth0Id),
            keyValue("has_image", image != null),
            keyValue("has_payload", command != null));
        return userInternalClient.updateUser(auth0Id, command, image);
    }

    public UserView ensureCurrentUser() {
        logger.info("Ensure current user",
            keyValue("action", "ensure_current_user"));
        return userInternalClient.ensureCurrentUser();
    }

    public void deleteCurrentUser() {
        logger.info("Delete current user",
            keyValue("action", "delete_current_user"));
        userInternalClient.deleteCurrentUser();
    }

    public void follow(String entityType, Long entityId) {
        logger.info("Follow entity",
            keyValue("action", "follow_entity"),
            keyValue("entity_type", entityType),
            keyValue("entity_id", entityId));
        userInternalClient.follow(entityType, entityId);
    }

    public void unfollow(String entityType, Long entityId) {
        logger.info("Unfollow entity",
            keyValue("action", "unfollow_entity"),
            keyValue("entity_type", entityType),
            keyValue("entity_id", entityId));
        userInternalClient.unfollow(entityType, entityId);
    }
}
