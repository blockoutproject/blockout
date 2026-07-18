package com.blockout.config.scraperstatus.application;

public class ScraperNotFoundException extends RuntimeException {

    public ScraperNotFoundException(String name) {
        super("Scraper not found with name: " + name);
    }
}
