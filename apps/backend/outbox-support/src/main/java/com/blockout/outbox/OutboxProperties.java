package com.blockout.outbox;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("blockout.outbox")
public class OutboxProperties {

    private boolean publisherEnabled = true;
    private int batchSize = 50;
    private Duration retention = Duration.ofDays(7);

    public boolean isPublisherEnabled() {
        return publisherEnabled;
    }

    public void setPublisherEnabled(boolean publisherEnabled) {
        this.publisherEnabled = publisherEnabled;
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        if (batchSize < 1 || batchSize > 500) {
            throw new IllegalArgumentException("blockout.outbox.batch-size must be between 1 and 500");
        }
        this.batchSize = batchSize;
    }

    public Duration getRetention() {
        return retention;
    }

    public void setRetention(Duration retention) {
        if (retention == null || retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("blockout.outbox.retention must be positive");
        }
        this.retention = retention;
    }
}
