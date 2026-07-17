package com.blockout.users.account.application;

/** Stores and removes profile images without exposing an object-storage SDK to application code. */
public interface ProfileImageStorage {

    /** Uploads validated profile-image bytes and returns their retained public URL. */
    String upload(UserProfileImageUpload image, String folder);

    /** Deletes the object represented by an owned public URL and ignores foreign URLs. */
    void deleteByUrl(String url);
}
