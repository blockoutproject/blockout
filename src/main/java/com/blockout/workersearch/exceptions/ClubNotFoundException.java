package com.blockout.workersearch.exceptions;

public class ClubNotFoundException extends RuntimeException {
    public ClubNotFoundException(String id) {
        super("Search not found with id " + id);
    }
}
