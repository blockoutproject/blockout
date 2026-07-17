package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockout.notifications.models.dto.ResolvePageDTO;
import com.blockout.notifications.models.entity.PushToken;
import com.blockout.notifications.repositories.PushTokenRepository;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PushTokenService {

    private static final Logger logger = LoggerFactory.getLogger(PushTokenService.class);

    private final PushTokenRepository tokenRepository;

    /**
     * Résout, pour une page de userIds, la map userId -> liste de tokens actifs
     * + la liste des users sans token actif.
     */
    @Transactional(readOnly = true)
    public ResolvePageDTO resolveTokensPage(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new ResolvePageDTO(Map.of(), Set.of());
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

        return new ResolvePageDTO(tokensByUser, noTokenUserIds);
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

}
