package com.blockout.clubs.shared.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.Objects;
import java.util.stream.Stream;
import org.slf4j.Logger;

public final class ChangeLog {

    private ChangeLog() {
    }

    public static <T> void logChanges(
            T before,
            T after,
            Logger logger,
            String action,
            Object id) {
        String diff = Stream.of(after.getClass().getDeclaredFields())
                .peek(field -> field.setAccessible(true))
                .map(field -> {
                    try {
                        Object oldValue = field.get(before);
                        Object newValue = field.get(after);
                        if (!Objects.equals(oldValue, newValue)) {
                            return field.getName() + ": " + oldValue + " -> " + newValue;
                        }
                    } catch (IllegalAccessException ignored) {
                        // Accessible record components are expected; inaccessible fields are omitted as before.
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .reduce((left, right) -> left + "; " + right)
                .orElse("");

        if (!diff.isBlank()) {
            logger.info("Changes: {}", diff, keyValue("action", action), keyValue("entityId", id));
        }
    }
}
