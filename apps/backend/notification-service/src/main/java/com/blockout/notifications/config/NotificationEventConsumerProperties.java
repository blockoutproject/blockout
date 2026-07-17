package com.blockout.notifications.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Fails startup if both side-effect wire versions are enabled for one route family. */
@Component
@ConfigurationProperties("blockout.events.consumers")
public class NotificationEventConsumerProperties implements InitializingBean {

    private boolean matchesV1Enabled = true;
    private boolean matchesV2Enabled;
    private boolean favoritesV1Enabled = true;
    private boolean favoritesV2Enabled;

    @Override
    public void afterPropertiesSet() {
        requireExclusive("matches", matchesV1Enabled, matchesV2Enabled);
        requireExclusive("favorites", favoritesV1Enabled, favoritesV2Enabled);
    }

    private void requireExclusive(String family, boolean v1Enabled, boolean v2Enabled) {
        if (v1Enabled && v2Enabled) {
            throw new IllegalStateException(
                    "MRG-304 forbids simultaneous v1/v2 side-effect consumers for " + family);
        }
    }

    public boolean isMatchesV1Enabled() {
        return matchesV1Enabled;
    }

    public void setMatchesV1Enabled(boolean matchesV1Enabled) {
        this.matchesV1Enabled = matchesV1Enabled;
    }

    public boolean isMatchesV2Enabled() {
        return matchesV2Enabled;
    }

    public void setMatchesV2Enabled(boolean matchesV2Enabled) {
        this.matchesV2Enabled = matchesV2Enabled;
    }

    public boolean isFavoritesV1Enabled() {
        return favoritesV1Enabled;
    }

    public void setFavoritesV1Enabled(boolean favoritesV1Enabled) {
        this.favoritesV1Enabled = favoritesV1Enabled;
    }

    public boolean isFavoritesV2Enabled() {
        return favoritesV2Enabled;
    }

    public void setFavoritesV2Enabled(boolean favoritesV2Enabled) {
        this.favoritesV2Enabled = favoritesV2Enabled;
    }
}
