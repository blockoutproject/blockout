package com.blockout.notifications;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.inbox.application.NotificationInboxWriteApplicationService;
import com.blockout.notifications.inbox.persistence.NotificationInboxEntity;
import com.blockout.notifications.inbox.persistence.NotificationInboxRepository;
import com.blockout.notifications.delivery.application.NotificationDeliveryApplicationService;
import com.blockout.notifications.delivery.persistence.DeliveryAttemptEntity;
import com.blockout.notifications.delivery.persistence.DeliveryAttemptRepository;
import com.blockout.notifications.events.application.ConsumedEventProcessor;
import com.blockout.notifications.events.persistence.JdbcConsumedEventStore;
import com.blockout.notifications.followers.application.FollowerProjectionApplicationService;
import com.blockout.notifications.followers.persistence.FollowerProjectionEntity;
import com.blockout.notifications.followers.persistence.FollowerProjectionRepository;
import com.blockout.notifications.push.application.PushTokenRegistrationApplicationService;
import com.blockout.notifications.push.persistence.PushTokenEntity;
import com.blockout.notifications.push.persistence.PushTokenRepository;
import com.blockout.notifications.services.NotificationOrchestratorService;
import com.blockout.shared.model.NotificationStatusEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class NotificationPersistenceArchitectureTest {

    @Test
    void roleOwnedRowsAndRepositoriesLiveInTheirPersistencePackages() {
        assertThat(NotificationInboxEntity.class.getPackageName())
                .isEqualTo("com.blockout.notifications.inbox.persistence");
        assertThat(NotificationInboxRepository.class.getPackageName())
                .isEqualTo("com.blockout.notifications.inbox.persistence");
        assertThat(PushTokenEntity.class.getPackageName())
                .isEqualTo("com.blockout.notifications.push.persistence");
        assertThat(PushTokenRepository.class.getPackageName())
                .isEqualTo("com.blockout.notifications.push.persistence");
        assertThat(DeliveryAttemptEntity.class.getPackageName())
                .isEqualTo("com.blockout.notifications.delivery.persistence");
        assertThat(DeliveryAttemptRepository.class.getPackageName())
                .isEqualTo("com.blockout.notifications.delivery.persistence");
        assertThat(FollowerProjectionEntity.class.getPackageName())
                .isEqualTo("com.blockout.notifications.followers.persistence");
        assertThat(FollowerProjectionRepository.class.getPackageName())
                .isEqualTo("com.blockout.notifications.followers.persistence");
        assertThat(JdbcConsumedEventStore.class.getPackageName())
                .isEqualTo("com.blockout.notifications.events.persistence");
    }

    @Test
    void applicationWritersDependOnlyOnRoleOwnedPorts() {
        assertThat(instanceFieldPackages(NotificationInboxWriteApplicationService.class))
                .containsOnly("com.blockout.notifications.inbox.application");
        assertThat(instanceFieldPackages(PushTokenRegistrationApplicationService.class))
                .containsOnly("com.blockout.notifications.push.application");
        assertThat(instanceFieldPackages(NotificationOrchestratorService.class))
                .noneMatch(name -> name.contains(".persistence") || name.contains(".repositories"));
        assertThat(instanceFieldPackages(NotificationDeliveryApplicationService.class))
                .containsOnly(
                        "com.blockout.notifications.delivery.application",
                        "com.blockout.notifications.inbox.application");
        assertThat(instanceFieldPackages(FollowerProjectionApplicationService.class))
                .containsOnly("com.blockout.notifications.followers.application");
        assertThat(instanceFieldPackages(ConsumedEventProcessor.class))
                .containsOnly("com.blockout.notifications.events.application");
    }

    @Test
    void relocatedEntitiesRetainTheirJpaIdentityAndTables() throws Exception {
        assertThat(NotificationInboxEntity.class.getAnnotation(Entity.class).name()).isEqualTo("UserNotification");
        assertThat(NotificationInboxEntity.class.getAnnotation(Table.class).name()).isEqualTo("user_notifications");
        assertThat(PushTokenEntity.class.getAnnotation(Entity.class).name()).isEqualTo("PushToken");
        assertThat(PushTokenEntity.class.getAnnotation(Table.class).name()).isEqualTo("push_tokens");
        assertThat(DeliveryAttemptEntity.class.getAnnotation(Entity.class).name()).isEqualTo("NotificationSend");
        assertThat(DeliveryAttemptEntity.class.getAnnotation(Table.class).name()).isEqualTo("notification_send");
        assertThat(DeliveryAttemptEntity.class.getDeclaredField("notificationType").getType())
                .isEqualTo(NotificationTypeEnum.class);
        assertThat(DeliveryAttemptEntity.class.getDeclaredField("notificationType")
                        .getAnnotation(Column.class).name())
                .isEqualTo("notification_type");
        assertThat(DeliveryAttemptEntity.class.getDeclaredField("status").getType())
                .isEqualTo(NotificationStatusEnum.class);
        assertThat(DeliveryAttemptEntity.class.getAnnotation(Table.class).uniqueConstraints())
                .singleElement()
                .satisfies(constraint -> assertThat(constraint.columnNames())
                        .containsExactly("user_id", "match_id", "notification_type"));
        assertThat(FollowerProjectionEntity.class.getAnnotation(Entity.class).name())
                .isEqualTo("FollowersProjection");
        assertThat(FollowerProjectionEntity.class.getAnnotation(Table.class).name())
                .isEqualTo("followers_projection");
        assertThat(FollowerProjectionEntity.class.getAnnotation(Table.class).uniqueConstraints())
                .singleElement()
                .satisfies(constraint -> assertThat(constraint.columnNames())
                        .containsExactly("entity_type", "entity_id", "user_id"));
    }

    private java.util.List<String> instanceFieldPackages(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName())
                .toList();
    }
}
