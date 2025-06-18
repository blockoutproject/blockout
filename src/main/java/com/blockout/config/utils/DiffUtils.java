package com.blockout.config.utils;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.Objects;
import java.util.stream.Stream;

import org.slf4j.Logger;

public final class DiffUtils {

    /**
     * Compare chaque champ en utilisant la réflexion et loggue uniquement ceux qui
     * changent.
     *
     * @param <T>    Type d’entité (Team, Pool, Match…)
     * @param before Copie immuable de l’état initial (avant modification)
     * @param after  Entité persistée (après save)
     * @param logger Logger SLF4J injecté depuis le service appelant
     * @param action Tag fonctionnel (update_team, update_pool…)
     * @param id     Identifiant fonctionnel de l’entité
     */
    public static <T> void logChanges(T before,
            T after,
            Logger logger,
            String action,
            Long id) {

        String diff = Stream.of(after.getClass().getDeclaredFields())
                .peek(f -> f.setAccessible(true))
                .map(f -> {
                    try {
                        Object oldVal = f.get(before);
                        Object newVal = f.get(after);
                        if (!Objects.equals(oldVal, newVal)) {
                            return f.getName() + ": " + oldVal + " -> " + newVal;
                        }
                    } catch (IllegalAccessException ignored) {
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .reduce((a, b) -> a + "; " + b)
                .orElse("");

        if (!diff.isBlank()) {
            logger.info("Changes: {}", diff,
                    keyValue("action", action),
                    keyValue("entityId", id));
        }
    }
}