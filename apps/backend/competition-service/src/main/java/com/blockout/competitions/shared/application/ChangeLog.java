package com.blockout.competitions.shared.application;

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
                .map(field -> valueChange(field.getName(), fieldValue(field, before), fieldValue(field, after)))
                .filter(Objects::nonNull)
                .reduce((left, right) -> left + "; " + right)
                .orElse("");

        if (!diff.isBlank()) {
            logger.info("Changes: {}", diff, keyValue("action", action), keyValue("entityId", id));
        }
    }

    private static Object fieldValue(java.lang.reflect.Field field, Object source) {
        try {
            return field.get(source);
        } catch (IllegalAccessException exception) {
            throw new IllegalStateException("Unable to read change-log field", exception);
        }
    }

    private static String valueChange(String name, Object before, Object after) {
        return Objects.equals(before, after) ? null : name + ": " + before + " -> " + after;
    }
}
