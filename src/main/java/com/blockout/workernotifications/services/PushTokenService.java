package com.blockout.workernotifications.services;

import com.blockout.workernotifications.models.PushToken;
import com.blockout.workernotifications.models.dto.ResolvePage;
import com.blockout.workernotifications.models.dto.pushTokens.RegisterPushTokenRequest;
import com.blockout.workernotifications.repositories.PushTokenRepository;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PushTokenService {

    private static final Logger logger = LoggerFactory.getLogger(PushTokenService.class);

    private final PushTokenRepository tokenRepository;

    /**
     * Enregistre ou met à jour un token Expo pour un utilisateur.
     * - Si le token existe déjà: ré-attache au bon user, réactive, MAJ
     * platform/deviceId,
     * et supprime d'éventuels doublons (même user+deviceId) via un delete bulk.
     * - Sinon si deviceId déjà connu pour ce user: rotation du token sur la même
     * ligne.
     * - Sinon: création d'une nouvelle ligne.
     */
    @Transactional
    public void register(Long userId, RegisterPushTokenRequest req) {
        String newToken = req.getExpoPushToken();
        String deviceId = req.getDeviceId();

        // 1) Le token existe déjà → rattacher au bon user + MAJ
        var existingByToken = tokenRepository.findByExpoPushToken(newToken);
        if (existingByToken.isPresent()) {
            var row = existingByToken.get();
            Long prevUser = row.getUserId();

            row.setUserId(userId);
            row.setPlatform(req.getPlatform());
            row.setActive(true);
            if (deviceId != null && !deviceId.isBlank()) {
                row.setDeviceId(deviceId);
            }
            tokenRepository.save(row);

            // Ménage des doublons potentiels (même user/deviceId)
            if (deviceId != null && !deviceId.isBlank()) {
                tokenRepository.deleteOthersByUserAndDevice(userId, deviceId, row.getId());
            }

            logger.info("Push token reattached",
                    keyValue("action", "register_push_token"),
                    keyValue("token", mask(newToken)),
                    keyValue("fromUserId", prevUser),
                    keyValue("toUserId", userId),
                    keyValue("platform", req.getPlatform().name()),
                    keyValue("deviceId", deviceId));
            return;
        }

        // 2) Rotation par deviceId (ligne existante à réutiliser)
        if (deviceId != null && !deviceId.isBlank()) {
            var existingByDevice = tokenRepository.findByUserIdAndDeviceId(userId, deviceId);
            if (existingByDevice.isPresent()) {
                var row = existingByDevice.get();
                row.setExpoPushToken(newToken);
                row.setPlatform(req.getPlatform());
                row.setActive(true);
                tokenRepository.save(row);

                // Supprimer d'éventuels doublons (autres lignes pour ce user/deviceId)
                tokenRepository.deleteOthersByUserAndDevice(userId, deviceId, row.getId());

                logger.info("Push token rotated (by deviceId)",
                        keyValue("action", "register_push_token"),
                        keyValue("userId", userId),
                        keyValue("platform", req.getPlatform().name()),
                        keyValue("deviceId", deviceId));
                return;
            }
        }

        // 3) Nouveau device
        var entity = PushToken.builder()
                .userId(userId)
                .expoPushToken(newToken)
                .platform(req.getPlatform())
                .deviceId(deviceId)
                .active(true)
                .build();
        tokenRepository.save(entity);

        logger.info("Push token registered",
                keyValue("action", "register_push_token"),
                keyValue("userId", userId),
                keyValue("platform", req.getPlatform().name()),
                keyValue("deviceId", deviceId));
    }

    /**
     * Résout, pour une page de userIds, la map userId -> liste de tokens actifs
     * + la liste des users sans token actif.
     */
    @Transactional(readOnly = true)
    public ResolvePage resolveTokensPage(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new ResolvePage(Map.of(), Set.of());
        }

        var rows = tokenRepository.findAllByUserIdInAndActiveTrue(userIds);

        Map<Long, List<String>> tokensByUser = rows.stream()
                .collect(Collectors.groupingBy(
                        PushToken::getUserId,
                        Collectors.mapping(PushToken::getExpoPushToken, Collectors.toList())));

        Set<Long> noTokenUserIds = userIds.stream()
                .filter(id -> {
                    List<String> tokens = tokensByUser.get(id);
                    return tokens == null || tokens.isEmpty();
                })
                .collect(Collectors.toCollection(LinkedHashSet::new));

        logger.info("Resolved tokens (page)",
                keyValue("action", "resolve_tokens_page"),
                keyValue("userCount", userIds.size()),
                keyValue("resolvedUserCount", tokensByUser.size()),
                keyValue("noTokenUsers", noTokenUserIds.size()));

        return new ResolvePage(tokensByUser, noTokenUserIds);
    }

    /**
     * Désactive en masse une collection de tokens (UPDATE bulk).
     */
    @Transactional
    public void deactivateByTokens(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return;
        }

        List<String> distinct = tokens.stream()
                .filter(t -> t != null && !t.isBlank())
                .distinct()
                .toList();

        if (distinct.isEmpty()) {
            return;
        }

        int updated = tokenRepository.deactivateByTokens(distinct);

        logger.info("Push token batch deactivated",
                keyValue("action", "deactivate_push_token_batch"),
                keyValue("requested", tokens.size()),
                keyValue("distinct", distinct.size()),
                keyValue("deactivated", updated));
    }

    private String mask(String token) {
        if (token == null || token.length() < 8)
            return "***";
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }
}