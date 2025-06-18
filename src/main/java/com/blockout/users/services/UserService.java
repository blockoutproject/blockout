package com.blockout.users.services;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.config.Auth0TokenManager;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.UserRegistrationRequest;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.models.enums.UserRole;
import com.blockout.users.models.mappers.CustomUserMapper;
import com.blockout.users.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final Auth0TokenManager tokenManager;
    private final UserRepository userRepository;
    private final CustomUserMapper customUserMapper;

    /**
     * Récupère un utilisateur par son ID Auth0
     * 
     * @param auth0Id L'identifiant Auth0 de l'utilisateur
     * @return Optional contenant l'utilisateur s'il existe
     */
    public Optional<CustomUserDto> getUserByAuth0Id(String auth0Id) {
        return userRepository.findByAuth0IdWithFavorites(auth0Id)
            .map(customUserMapper::toDto);
    }

    /**
     * Enregistre un nouvel utilisateur
     * 
     * @param user L'utilisateur à enregistrer
     * @return L'utilisateur enregistré avec son ID généré
     * @throws Auth0Exception
     */
    @Transactional
    public CustomUser registerUser(String auth0Id, UserRegistrationRequest registrationRequest) throws Auth0Exception {
        ManagementAPI managementAPI = tokenManager.getManagementAPI();
        User auth0User = managementAPI.users().get(auth0Id, null).execute().getBody();
        if (auth0User == null) {
            throw new Auth0Exception("Utilisateur non trouvé dans Auth0 pour l'id: " + auth0Id);
        }

        CustomUser user = CustomUser.builder()
                .auth0Id(auth0User.getId())
                .email(auth0User.getEmail())
                .pseudo(registrationRequest.getPseudo())
                .firstName(auth0User.getGivenName())
                .lastName(auth0User.getFamilyName())
                .pictureUrl(auth0User.getPicture())
                .phoneNumber(auth0User.getPhoneNumber())
                .role(UserRole.USER)
                .active(true)
                .build();

        logger.info("Enregistrement d'un nouvel utilisateur",
                keyValue("action", "register_user"),
                keyValue("email", user.getEmail()));

        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setLastUpdate(now);

        CustomUser createdUser = userRepository.save(user);
        logger.info("Utilisateur créé avec succès",
                keyValue("action", "register_user"),
                keyValue("userId", createdUser.getId()));

        return createdUser;
    }
}