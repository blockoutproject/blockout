package com.blockout.users.services;

import com.blockout.users.models.dto.RegisterPushTokenRequest;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.UserDeviceToken;
import com.blockout.users.repositories.UserDeviceTokenRepository;
import com.blockout.users.repositories.UserRepository;

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

    private final UserRepository userRepository;
    private final UserDeviceTokenRepository tokenRepository;

    @Transactional
    public void register(Long userId, RegisterPushTokenRequest req) {
        CustomUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String newToken = req.getExpoPushToken();
        String deviceId = req.getDeviceId();

        // 1) Ce token existe déjà → rattacher au bon user + MAJ
        var existingByToken = tokenRepository.findByExpoPushToken(newToken);
        if (existingByToken.isPresent()) {
            var row = existingByToken.get();
            Long prevUser = row.getUser().getId();

            row.setUser(user);
            row.setPlatform(req.getPlatform());
            row.setActive(true);
            if (deviceId != null && !deviceId.isBlank())
                row.setDeviceId(deviceId);
            tokenRepository.save(row);

            // ménage de doublons potentiels (même user/deviceId)
            if (deviceId != null && !deviceId.isBlank()) {
                tokenRepository.findAllByUser_IdAndDeviceId(userId, deviceId).stream()
                        .filter(other -> !Objects.equals(other.getId(), row.getId()))
                        .forEach(tokenRepository::delete);
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
            var existingByDevice = tokenRepository.findByUser_IdAndDeviceId(userId, deviceId);
            if (existingByDevice.isPresent()) {
                var row = existingByDevice.get();
                row.setExpoPushToken(newToken);
                row.setPlatform(req.getPlatform());
                row.setActive(true);
                tokenRepository.save(row);

                logger.info("Push token rotated (by deviceId)",
                        keyValue("action", "register_push_token"),
                        keyValue("userId", userId),
                        keyValue("platform", req.getPlatform().name()),
                        keyValue("deviceId", deviceId));
                return;
            }
        }

        // 3) Nouveau device
        var entity = UserDeviceToken.builder()
                .user(user)
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

    @Transactional(readOnly = true)
    public Map<Long, List<String>> resolveTokens(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty())
            return Map.of();

        var rows = tokenRepository.findAllByUser_IdInAndActiveTrue(userIds);

        var result = rows.stream().collect(Collectors.groupingBy(
                row -> row.getUser().getId(),
                Collectors.mapping(UserDeviceToken::getExpoPushToken, Collectors.toList())));

        logger.info("Resolved tokens",
                keyValue("action", "resolve_tokens"),
                keyValue("userCount", userIds.size()),
                keyValue("resolvedUserCount", result.size()));

        return result;
    }

    @Transactional
    public void deactivateByTokens(List<String> tokens) {
        if (tokens == null || tokens.isEmpty())
            return;

        tokens.stream()
                .filter(t -> t != null && !t.isBlank())
                .distinct()
                .forEach(token -> {
                    var row = tokenRepository.findByExpoPushToken(token).orElse(null);
                    if (row == null) {
                        logger.info("Token not found to deactivate",
                                keyValue("action", "deactivate_push_token"),
                                keyValue("token", mask(token)));
                        return;
                    }
                    if (Boolean.FALSE.equals(row.getActive())) {
                        logger.info("Token already inactive",
                                keyValue("action", "deactivate_push_token"),
                                keyValue("userId", row.getUser().getId()),
                                keyValue("token", mask(token)));
                        return;
                    }
                    row.setActive(false);
                    tokenRepository.save(row);

                    logger.info("Push token deactivated",
                            keyValue("action", "deactivate_push_token"),
                            keyValue("userId", row.getUser().getId()),
                            keyValue("token", mask(token)));
                });

        logger.info("Deactivated {} token(s)",
                keyValue("action", "deactivate_push_token_batch"),
                keyValue("count", tokens.size()));
    }

    private String mask(String token) {
        if (token == null || token.length() < 8)
            return "***";
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }
}