package com.blockout.config.scraperstatus.application;

import com.blockout.shared.model.ScraperNameEnum;
import java.time.LocalDateTime;

public record ScraperStatusView(Long id, ScraperNameEnum name, boolean enabled, LocalDateTime lastUpdate) {
}
