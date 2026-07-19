package com.blockout.matches.match.application.exceptions;

public class MatchNotFoundException extends RuntimeException {
    public MatchNotFoundException(Long id) {
        super("Match not found with id: " + id);
    }
}
