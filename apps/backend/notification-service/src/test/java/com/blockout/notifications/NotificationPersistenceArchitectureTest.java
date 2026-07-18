package com.blockout.notifications;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.inbox.application.NotificationInboxWriteApplicationService;
import com.blockout.notifications.inbox.persistence.NotificationInboxEntity;
import com.blockout.notifications.inbox.persistence.NotificationInboxRepository;
import com.blockout.notifications.push.application.PushTokenRegistrationApplicationService;
import com.blockout.notifications.push.persistence.PushTokenEntity;
import com.blockout.notifications.push.persistence.PushTokenRepository;
import com.blockout.notifications.services.NotificationOrchestratorService;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class NotificationPersistenceArchitectureTest {

    @Test
    void inboxAndTokenRowsAreOwnedByTheirPersistencePackages() {
        assertThat(NotificationInboxEntity.class.getPackageName())
                .isEqualTo("com.blockout.notifications.inbox.persistence");
        assertThat(NotificationInboxRepository.class.getPackageName())
                .isEqualTo("com.blockout.notifications.inbox.persistence");
        assertThat(PushTokenEntity.class.getPackageName())
                .isEqualTo("com.blockout.notifications.push.persistence");
        assertThat(PushTokenRepository.class.getPackageName())
                .isEqualTo("com.blockout.notifications.push.persistence");
    }

    @Test
    void applicationWritersDependOnlyOnRoleOwnedPorts() {
        assertThat(instanceFieldPackages(NotificationInboxWriteApplicationService.class))
                .containsOnly("com.blockout.notifications.inbox.application");
        assertThat(instanceFieldPackages(PushTokenRegistrationApplicationService.class))
                .containsOnly("com.blockout.notifications.push.application");
        assertThat(instanceFieldPackages(NotificationOrchestratorService.class))
                .noneMatch(name -> name.contains(".persistence") || name.contains(".repositories"));
    }

    @Test
    void relocatedEntitiesRetainTheirJpaIdentityAndTables() {
        assertThat(NotificationInboxEntity.class.getAnnotation(Entity.class).name()).isEqualTo("UserNotification");
        assertThat(NotificationInboxEntity.class.getAnnotation(Table.class).name()).isEqualTo("user_notifications");
        assertThat(PushTokenEntity.class.getAnnotation(Entity.class).name()).isEqualTo("PushToken");
        assertThat(PushTokenEntity.class.getAnnotation(Table.class).name()).isEqualTo("push_tokens");
    }

    private java.util.List<String> instanceFieldPackages(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName())
                .toList();
    }
}
