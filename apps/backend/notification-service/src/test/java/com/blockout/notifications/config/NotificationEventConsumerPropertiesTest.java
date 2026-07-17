package com.blockout.notifications.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class NotificationEventConsumerPropertiesTest {

    @Test
    void defaultsToV1SideEffectsOnly() {
        assertThatCode(new NotificationEventConsumerProperties()::afterPropertiesSet).doesNotThrowAnyException();
    }

    @Test
    void allowsThePausedStateAndRejectsConcurrentWireVersions() {
        NotificationEventConsumerProperties paused = new NotificationEventConsumerProperties();
        paused.setMatchesV1Enabled(false);
        paused.setFavoritesV1Enabled(false);
        assertThatCode(paused::afterPropertiesSet).doesNotThrowAnyException();

        NotificationEventConsumerProperties invalid = new NotificationEventConsumerProperties();
        invalid.setMatchesV2Enabled(true);
        assertThatThrownBy(invalid::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("simultaneous v1/v2")
                .hasMessageContaining("matches");
    }
}
