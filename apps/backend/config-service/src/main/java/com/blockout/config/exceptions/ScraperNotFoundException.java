package com.blockout.config.exceptions;

public class ScraperNotFoundException extends RuntimeException {
    public ScraperNotFoundException(String name) {
        super("Scraper not found with name: " + name);
    }
}
