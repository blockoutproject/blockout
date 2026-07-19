package com.blockout.clubs.club.application.ports;

import com.blockout.clubs.club.application.commands.ClubImageCommand;

/**
 * Stores and removes Club logos without exposing a storage provider to the application layer.
 */
public interface ClubImageStorage {

    /**
     * Stores a Club image and returns its public URL.
     *
     * @param image validated image content.
     * @return public image URL.
     */
    String uploadClubImage(ClubImageCommand image);

    /**
     * Removes an image when its URL belongs to this storage adapter.
     *
     * @param url public image URL.
     */
    void deleteClubImage(String url);
}
