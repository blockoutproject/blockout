package com.blockout.users.user.application.ports;

import com.blockout.users.user.application.commands.UserImageCommand;

public interface UserImageStorage {

    String uploadProfileImage(UserImageCommand image);

    void deleteProfileImage(String imageUrl);
}
