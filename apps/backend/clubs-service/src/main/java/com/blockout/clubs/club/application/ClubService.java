package com.blockout.clubs.club.application;

import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.commands.UpdateClubCommand;
import com.blockout.clubs.club.application.views.ClubView;

import java.util.List;

/**
 * Application boundary for V1 club resources.
 */
public interface ClubService {

    List<ClubView> findClubs(List<String> ids, Boolean active);

    ClubView getClubById(String id);

    ClubView createClub(CreateClubCommand command);

    ClubView updateClub(String id, UpdateClubCommand command);

    void deactivateClub(String id);
}
