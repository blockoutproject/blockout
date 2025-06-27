package com.blockout.users.services;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.config.Auth0TokenManager;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.models.dto.UserRegistrationRequestDTO;
import com.blockout.users.models.enums.UserRole;
import com.blockout.users.models.mappers.CustomUserMapper;
import com.blockout.users.repositories.UserRepository;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final Auth0TokenManager tokenManager;
    private final UserRepository userRepository;
    private final CustomUserMapper customUserMapper;

    /**
     * Récupère un utilisateur par son ID Auth0.
     *
     * @param auth0Id L'identifiant Auth0
     * @return L'utilisateur mappé en DTO
     * @throws CustomUserNotFoundException si aucun utilisateur n'est trouvé
     */
    public CustomUserDto getUserByAuth0Id(String auth0Id) {
        return userRepository.findByAuth0IdWithFavorites(auth0Id)
                .map(customUserMapper::toDto)
                .orElseThrow(() -> {
                    logger.warn("Utilisateur introuvable", keyValue("auth0Id", auth0Id));
                    return new CustomUserNotFoundException(auth0Id);
                });
    }

    /**
     * Enregistre un nouvel utilisateur à partir des informations Auth0.
     *
     * @param auth0Id             Le subject du token Auth0
     * @param registrationRequest L'objet contenant les infos d'enregistrement
     * @return L'utilisateur persisté
     * @throws Auth0Exception si la récupération de l'utilisateur Auth0 échoue
     */
    @Transactional
    public CustomUser registerUser(String auth0Id, UserRegistrationRequestDTO registrationRequest) throws Auth0Exception {
        ManagementAPI managementAPI = tokenManager.getManagementAPI();
        User auth0User = managementAPI.users().get(auth0Id, null).execute().getBody();

        if (auth0User == null) {
            throw new Auth0Exception("Utilisateur non trouvé dans Auth0 pour l'ID: " + auth0Id);
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

        logger.info("Enregistrement d'un nouvel utilisateur", keyValue("email", user.getEmail()));
        CustomUser created = userRepository.save(user);
        logger.info("Utilisateur créé avec succès", keyValue("userId", created.getId()));

        return created;
    }
}