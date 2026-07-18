package com.blockout.clubs.club.application;

public interface ClubUpdate {

    ClubView current();

    ClubChange apply(ClubUpdatePlan plan);
}
