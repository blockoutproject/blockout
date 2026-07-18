package com.blockout.config.shared.application;

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
            Long id) {
        String diff = Stream.of(after.getClass().getDeclaredFields())
                .peek(field -> field.setAccessible(true))
                .map(field -> difference(field, before, after))
                .filter(Objects::nonNull)
                .reduce((left, right) -> left + "; " + right)
                .orElse("");

        if (!diff.isBlank()) {
            logger.info("Changes: {}", diff, keyValue("action", action), keyValue("entityId", id));
        }
    }

    private static <T> String difference(java.lang.reflect.Field field, T before, T after) {
        try {
            Object previousValue = field.get(before);
            Object currentValue = field.get(after);
            return Objects.equals(previousValue, currentValue)
                    ? null
                    : field.getName() + ": " + previousValue + " -> " + currentValue;
        } catch (IllegalAccessException exception) {
            return null;
        }
    }
}
