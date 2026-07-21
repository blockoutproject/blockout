package com.blockout.config.division.application.ports;

import com.blockout.config.division.application.commands.DivisionImageCommand;

/**
 * Stores and deletes managed Division images.
 */
public interface DivisionImageStorage {

    /**
     * Uploads a division image and returns its public URL.
     */
    String uploadDivisionImage(DivisionImageCommand image);

    /**
     * Deletes a managed division image while ignoring external URLs.
     */
    void deleteDivisionImage(String imageUrl);
}
