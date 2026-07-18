package com.blockout.notifications.followers.application;

import com.blockout.shared.model.FollowerProjectionMutationEnum;
/** Applies one wire-independent favorite fact to the derived projection. */
public interface FollowerProjectionConsumer {

    FollowerProjectionMutationEnum apply(FollowerProjectionCommand command);
}
