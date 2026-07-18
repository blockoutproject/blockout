package com.blockout.workersearch.config;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class LifecycleEventConsumerPropertiesTest {

    @Test
    void acceptsV1DefaultV2CutoverAndPausedStates() {
        var properties = new LifecycleEventConsumerProperties();
        assertThatNoException().isThrownBy(properties::afterPropertiesSet);

        properties.setLifecycleV1Enabled(false);
        properties.setLifecycleV2Enabled(true);
        assertThatNoException().isThrownBy(properties::afterPropertiesSet);

        properties.setLifecycleV2Enabled(false);
        assertThatNoException().isThrownBy(properties::afterPropertiesSet);
    }

    @Test
    void rejectsSimultaneousSideEffectConsumers() {
        var properties = new LifecycleEventConsumerProperties();
        properties.setLifecycleV2Enabled(true);

        assertThatThrownBy(properties::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("simultaneous v1/v2");
    }
}
