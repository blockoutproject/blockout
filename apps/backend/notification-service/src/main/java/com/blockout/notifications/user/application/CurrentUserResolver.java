package com.blockout.notifications.user.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Enforces the retained local-user resolution outcome for inbox ownership. */
@Component
@RequiredArgsConstructor
public class CurrentUserResolver {

    private static final Logger LOGGER = LoggerFactory.getLogger(CurrentUserResolver.class);

    private final CurrentUserProvider provider;

    /** Returns the positive local user ID or preserves the deployed failure. */
    public Long requireUserId() {
        CurrentUserSnapshot user = provider.getCurrentUser();
        if (user == null || user.id() == null) {
            LOGGER.warn("User not found for auth0Id", keyValue("action", "resolve_user_id_failed"));
            throw new CurrentUserNotFoundException();
        }
        return user.id();
    }
}
