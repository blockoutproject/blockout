package com.blockout.notifications.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.users.CustomUserDto;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Client HTTP vers l'API Users.
 * Ne conserve désormais qu'un appel : récupérer un utilisateur par son Auth0 ID.
 */
@Service
@RequiredArgsConstructor
public class UsersClientService {

    private static final Logger logger = LoggerFactory.getLogger(UsersClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    /**
     * Récupère l'utilisateur (profil métier) via son identifiant Auth0.
     * Endoint côté Users API : GET /api/v1/users/{auth0Id}
     *
     * @param auth0Id identifiant Auth0 (sub)
     * @return l'utilisateur si trouvé, sinon null
     */
    public CustomUserDto getUserByAuth0Id(String auth0Id) {
        String base = apiClientProperties.getUser().getUrl();
        String url = base + "/api/v1/users/" + auth0Id;

        logger.info("Calling Users getUserByAuth0Id",
                keyValue("action", "call_users_get_by_auth0_id"),
                keyValue("url", url),
                keyValue("auth0Id", auth0Id));

        try {
            ResponseEntity<CustomUserDto> resp = apiClientService.get(url, CustomUserDto.class);

            logger.info("Users getUserByAuth0Id success",
                    keyValue("action", "users_get_by_auth0_id_success"),
                    keyValue("status", resp.getStatusCode().value()),
                    keyValue("auth0Id", auth0Id));

            return resp.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            logger.warn("Users getUserByAuth0Id not found",
                    keyValue("action", "users_get_by_auth0_id_not_found"),
                    keyValue("auth0Id", auth0Id));
            return null;
        } catch (HttpClientErrorException e) {
            logger.error("Users getUserByAuth0Id http error",
                    keyValue("action", "users_get_by_auth0_id_http_error"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("status", e.getStatusCode().value()),
                    e);
            throw e;
        } catch (Exception e) {
            logger.error("Users getUserByAuth0Id unexpected error",
                    keyValue("action", "users_get_by_auth0_id_unexpected_error"),
                    keyValue("auth0Id", auth0Id),
                    e);
            throw e;
        }
    }
}