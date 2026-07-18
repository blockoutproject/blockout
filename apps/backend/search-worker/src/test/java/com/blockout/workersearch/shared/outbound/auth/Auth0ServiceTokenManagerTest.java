package com.blockout.workersearch.shared.outbound.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class Auth0ServiceTokenManagerTest {

    @Test
    void startupFailsWhenNoInitialServiceTokenCanBeAcquired() {
        Auth0ServiceTokenManager manager = new Auth0ServiceTokenManager(() -> {
            throw new IllegalStateException("Auth0 unavailable");
        });

        assertThatThrownBy(manager::initialize)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Unable to initialize Auth0 token");
    }

    @Test
    void scheduledFailureRetainsTheLastKnownGoodToken() {
        FailingAfterFirstTokenProvider provider = new FailingAfterFirstTokenProvider();
        Auth0ServiceTokenManager manager = new Auth0ServiceTokenManager(provider);
        manager.initialize();
        LocalDateTime initialExpiry = manager.getTokenExpiry();

        manager.refresh();

        assertThat(manager.getAccessToken()).isEqualTo("known-good");
        assertThat(manager.getTokenExpiry()).isEqualTo(initialExpiry);
    }

    private static final class FailingAfterFirstTokenProvider implements ServiceTokenProvider {
        private boolean acquired;

        @Override
        public ServiceTokenLease acquire() {
            if (acquired) {
                throw new IllegalStateException("Auth0 unavailable");
            }
            acquired = true;
            return new ServiceTokenLease("known-good", 3600);
        }
    }
}
