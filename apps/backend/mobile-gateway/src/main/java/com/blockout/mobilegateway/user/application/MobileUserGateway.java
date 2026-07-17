package com.blockout.mobilegateway.user.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.shared.model.EntityTypeEnum;

public interface MobileUserGateway {

    MobileUserWorkflow.UserView update(String auth0Id, MobileUserWorkflow.UpdateCommand command, BinaryPart image);

    MobileUserWorkflow.UserView ensureCurrent();

    void deleteCurrent();

    void follow(EntityTypeEnum entityType, Long entityId);

    void unfollow(EntityTypeEnum entityType, Long entityId);
}
