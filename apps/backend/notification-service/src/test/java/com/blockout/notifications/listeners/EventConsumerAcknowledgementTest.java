package com.blockout.notifications.listeners;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

class EventConsumerAcknowledgementTest {

    @Test
    void everySideEffectListenerDeclaresAutoAcknowledgement() {
        List<Class<?>> listeners = List.of(
                MatchFinishedListener.class,
                MatchLiveLinkCreatedListener.class,
                TeamFollowListener.class,
                PoolFollowListener.class);

        listeners.forEach(listener -> {
            List<RabbitListener> endpoints = Arrays.stream(listener.getDeclaredMethods())
                    .map(method -> method.getAnnotation(RabbitListener.class))
                    .filter(java.util.Objects::nonNull)
                    .toList();
            assertThat(endpoints).hasSize(2).allSatisfy(endpoint ->
                    assertThat(endpoint.ackMode()).isEqualTo("AUTO"));
        });
    }

    @Test
    void rabbitAdaptersDependOnApplicationRolesRatherThanPersistence() {
        List<Class<?>> listeners = List.of(
                MatchFinishedListener.class,
                MatchLiveLinkCreatedListener.class,
                TeamFollowListener.class,
                PoolFollowListener.class);

        listeners.forEach(listener -> assertThat(Arrays.stream(listener.getDeclaredFields())
                        .filter(field -> !java.lang.reflect.Modifier.isStatic(field.getModifiers()))
                        .map(field -> field.getType().getPackageName()))
                .noneMatch(name -> name.contains(".persistence") || name.contains(".repositories")));
    }
}
