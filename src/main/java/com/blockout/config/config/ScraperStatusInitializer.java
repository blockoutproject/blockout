package com.blockout.config.config;

import com.blockout.config.models.ScraperStatus;
import com.blockout.config.models.enums.ScraperName;
import com.blockout.config.repositories.ScraperStatusRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Configuration
@RequiredArgsConstructor
public class ScraperStatusInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(ScraperStatusInitializer.class);
    private final ScraperStatusRepository repository;

    @Override
    public void run(String... args) {
        Arrays.stream(ScraperName.values()).forEach(scraperName -> {
            repository.findByName(scraperName).ifPresentOrElse(
                existing -> logger.debug("Scraper already initialized",
                        keyValue("scraper", scraperName),
                        keyValue("enabled", existing.isEnabled())),
                () -> {
                    ScraperStatus newStatus = ScraperStatus.builder()
                            .name(scraperName)
                            .enabled(false)
                            .build();
                    repository.save(newStatus);
                    logger.info("Scraper status initialized",
                            keyValue("scraper", scraperName),
                            keyValue("enabled", false));
                }
            );
        });
    }
}