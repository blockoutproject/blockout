package com.blockout.matches.match.live.outbound;

import com.blockout.matches.match.live.application.CurrentUserProvider;
import com.blockout.matches.match.live.application.CurrentUserSnapshot;
import com.blockout.matches.usersclient.api.UserAccountsClient;
import com.blockout.matches.usersclient.model.UserAccountInternalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Reduces the generated users-service response to the two live-policy fields. */
@Component
@RequiredArgsConstructor
public class GeneratedCurrentUserAdapter implements CurrentUserProvider {

    private final UserAccountsClient users;

    /** {@inheritDoc} */
    @Override
    public CurrentUserSnapshot getCurrentUser() {
        UserAccountInternalResponse user = users.getCurrentUser();
        return user == null ? null : new CurrentUserSnapshot(user.getAuth0Id(), user.getCreatedAt());
    }
}
