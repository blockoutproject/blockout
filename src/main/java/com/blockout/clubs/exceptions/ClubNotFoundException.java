package com.blockout.clubs.exceptions;

public class ClubNotFoundException extends RuntimeException {
    public ClubNotFoundException(Long id) {
        super("Club not found with id " + id);
    }
}
