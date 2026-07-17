package com.blockout.notifications.user.outbound;

import com.blockout.notifications.user.application.CurrentUserProvider;
import com.blockout.notifications.user.application.CurrentUserSnapshot;
import com.blockout.notifications.usersclient.api.UserAccountsClient;
import com.blockout.notifications.usersclient.model.UserAccountInternalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Reduces the generated users-service response to the local identity field. */
@Component
@RequiredArgsConstructor
public class GeneratedCurrentUserProvider implements CurrentUserProvider {

    private final UserAccountsClient users;

    /** {@inheritDoc} */
    @Override
    public CurrentUserSnapshot getCurrentUser() {
        UserAccountInternalResponse user = users.getCurrentUser();
        return user == null ? null : new CurrentUserSnapshot(user.getId());
    }
}
