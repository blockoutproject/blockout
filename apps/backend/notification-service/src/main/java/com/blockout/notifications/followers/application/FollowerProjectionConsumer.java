package com.blockout.notifications.followers.application;

/** Applies one wire-independent favorite fact to the derived projection. */
public interface FollowerProjectionConsumer {

    FollowerProjectionMutation apply(FollowerProjectionCommand command);
}
