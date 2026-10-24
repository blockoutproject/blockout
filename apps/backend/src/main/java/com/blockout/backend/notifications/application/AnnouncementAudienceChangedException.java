package com.blockout.backend.notifications.application;

/** Safe transaction conflict when the current audience requires accounts outside the locked set. */
public class AnnouncementAudienceChangedException extends RuntimeException {
  /** Leaves recovery to the next ordinary pass/collection or a new explicit contribution intent. */
  public AnnouncementAudienceChangedException() {
    super("Announcement audience changed during account locking");
  }
}
