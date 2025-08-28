package com.blockout.workernotifications.services.clients;

import com.blockout.workernotifications.config.ApiClientProperties;
import com.blockout.workernotifications.models.dto.ResolvePage;
import com.blockout.workernotifications.models.dto.user.DeactivatePushTokenRequest;
import com.blockout.workernotifications.models.dto.user.ResolveTokensRequest;
import com.blockout.workernotifications.models.dto.user.ResolveTokensResponse;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Client HTTP vers l'API Users (endpoints push tokens), calqué sur ton style.
 * Utilise ApiClientService (RestTemplate authentifié) + ApiClientProperties pour la base URL.
 */
@Service
@RequiredArgsConstructor
public class UsersClientService {

    private static final Logger logger = LoggerFactory.getLogger(UsersClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    /**
     * Résout les tokens Expo pour une page de userIds, en utilisant /internal/push-tokens/resolve (DTOs de ton API Users).
     *
     * @param userIds page de userIds
     * @return ResolvePage : tokensByUser + noTokenUserIds (dérivé de la réponse)
     */
    public ResolvePage resolveTokens(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new ResolvePage(Collections.emptyMap(), Collections.emptySet());
        }

        String base = apiClientProperties.getUser().getUrl();
        String url = base + "/internal/push-tokens/resolve";

        logger.info("Calling Users resolveTokens",
                keyValue("action", "call_users_resolve_tokens"),
                keyValue("url", url),
                keyValue("userCount", userIds.size()));

        ResolveTokensRequest req = new ResolveTokensRequest();
        req.setUserIds(userIds);

        ResponseEntity<ResolveTokensResponse> response =
                apiClientService.post(url, req, ResolveTokensResponse.class);

        Map<Long, List<String>> tokensByUser =
                Optional.ofNullable(response.getBody())
                        .map(ResolveTokensResponse::getTokensByUserId)
                        .orElseGet(Collections::emptyMap);

        // Déduire les users sans token à partir de la page demandée et de la map retournée
        Set<Long> present = tokensByUser.keySet();
        Set<Long> noToken = userIds.stream()
                .filter(id -> !present.contains(id))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        logger.info("Users resolveTokens done",
                keyValue("action", "users_resolve_tokens_done"),
                keyValue("resolvedUsers", present.size()),
                keyValue("noTokenUsers", noToken.size()));

        return new ResolvePage(tokensByUser, noToken);
    }

    /**
     * Désactive en batch des tokens invalides via /internal/push-tokens/deactivate.
     * Ignore si la liste est vide.
     */
    public void deactivateTokens(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return;
        }

        String base = apiClientProperties.getUser().getUrl();
        String url = base + "/internal/push-tokens/deactivate";

        logger.info("Calling Users deactivateTokens",
                keyValue("action", "call_users_deactivate_tokens"),
                keyValue("url", url),
                keyValue("count", tokens.size()));

        DeactivatePushTokenRequest req = DeactivatePushTokenRequest.builder()
                .tokens(tokens)
                .build();

        apiClientService.post(url, req, Void.class);

        logger.info("Users deactivateTokens completed",
                keyValue("action", "users_deactivate_tokens_done"),
                keyValue("count", tokens.size()));
    }
}