package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.user.CustomUserDto;
import com.blockout.mobilegateway.models.dto.user.CustomUserUpdateDTO;
import com.blockout.mobilegateway.services.clients.UserClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = Logger.getLogger(UserService.class.getName());

    private final UserClientService userClientService;

    /**
     * PUT /users/{auth0Id} (multipart mixte JSON + fichier)
     */
    public CustomUserDto updateUser(String auth0Id, CustomUserUpdateDTO dto, MultipartFile image) {
        logger.info("Updating user with auth0Id: " + auth0Id);
        return userClientService.updateUser(auth0Id, dto, image);
    }

    /**
     * PUT /users/me (sans body)
     */
    public CustomUserDto ensureCurrentUser() {
        logger.info("Ensuring current user exists/updated");
        return userClientService.ensureCurrentUser();
    }

    /**
     * DELETE /users/me
     */
    public void deleteCurrentUser() {
        logger.info("Deleting current user");
        userClientService.deleteCurrentUser();
    }

    /**
     * POST /favorites/follow — Suivre une entité
     */
    public void follow(String auth0Id, String entityType, Long entityId) {
        logger.info(String.format("Following entity: type=%s id=%d for user=%s", entityType, entityId, auth0Id));
        userClientService.follow(auth0Id, entityType, entityId);
    }

    /**
     * DELETE /favorites/follow — Ne plus suivre une entité
     */
    public void unfollow(String auth0Id, String entityType, Long entityId) {
        logger.info(String.format("Unfollowing entity: type=%s id=%d for user=%s", entityType, entityId, auth0Id));
        userClientService.unfollow(auth0Id, entityType, entityId);
    }
}