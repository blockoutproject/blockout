package com.blockout.workersearch.projection.infrastructure.scheduling;

import com.blockout.workersearch.projection.application.ProjectionRefreshService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProjectionCacheInitializer {

    private final ProjectionRefreshService projectionRefreshService;

    @PostConstruct
    public void initialize() {
        projectionRefreshService.initializeCaches();
    }
}
