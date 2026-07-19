package com.blockout.clubs.club.application;

public record ClubChange(ClubView before, ClubView after) {

    public boolean changed() {
        return !before.equals(after);
    }
}
