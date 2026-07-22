package com.blockout.notifications.notification.infrastructure.providers.expo;

import com.blockout.notifications.config.ExpoClientProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

/** Protects optional enhanced-security configuration at the Expo provider boundary. */
@DisplayName("Expo push provider")
class ExpoPushProviderUnitTest {

    /** Verifies that the default Expo push mode does not require an enhanced-security token. */
    @Test
    @DisplayName("starts without an enhanced-security access token")
    void startsWithoutEnhancedSecurityAccessToken() {
        ExpoClientProperties properties = new ExpoClientProperties();

        assertThatCode(() -> new ExpoPushProvider(properties)).doesNotThrowAnyException();
    }
}
