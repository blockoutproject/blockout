package com.blockout.config.scraperstatus.application;

import com.blockout.shared.model.ScraperNameEnum;
import java.util.List;
import java.util.Optional;

public interface ScraperStatusStore {

    Optional<ScraperStatusView> findByName(ScraperNameEnum name);

    ScraperStatusChange upsert(ScraperNameEnum name, boolean enabled);

    List<ScraperStatusView> findAll();
}
