package com.blockout.clubs.exceptions;

public class ClubNotFoundException extends RuntimeException {
    public ClubNotFoundException(String id) {
        super("Club not found with id " + id);
    }
}
