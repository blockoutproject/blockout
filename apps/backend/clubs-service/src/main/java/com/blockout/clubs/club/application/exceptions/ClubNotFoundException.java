package com.blockout.clubs.club.application.exceptions;

public class ClubNotFoundException extends RuntimeException {

    public ClubNotFoundException(String id) {
        super("Club not found with id " + id);
    }
}
