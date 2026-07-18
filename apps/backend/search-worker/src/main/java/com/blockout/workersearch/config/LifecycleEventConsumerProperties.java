package com.blockout.workersearch.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Enforces the MRG-304 pause/drain/switch/resume gate for search projections. */
@Component
@ConfigurationProperties("blockout.events.consumers")
public class LifecycleEventConsumerProperties implements InitializingBean {

    private boolean lifecycleV1Enabled = true;
    private boolean lifecycleV2Enabled;

    @Override
    public void afterPropertiesSet() {
        if (lifecycleV1Enabled && lifecycleV2Enabled) {
            throw new IllegalStateException(
                    "MRG-304 forbids simultaneous v1/v2 lifecycle consumers in search-worker");
        }
    }

    public boolean isLifecycleV1Enabled() {
        return lifecycleV1Enabled;
    }

    public void setLifecycleV1Enabled(boolean lifecycleV1Enabled) {
        this.lifecycleV1Enabled = lifecycleV1Enabled;
    }

    public boolean isLifecycleV2Enabled() {
        return lifecycleV2Enabled;
    }

    public void setLifecycleV2Enabled(boolean lifecycleV2Enabled) {
        this.lifecycleV2Enabled = lifecycleV2Enabled;
    }
}
