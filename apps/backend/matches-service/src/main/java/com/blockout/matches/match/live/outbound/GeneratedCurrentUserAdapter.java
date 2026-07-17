package com.blockout.matches.match.live.outbound;

import com.blockout.matches.match.live.application.CurrentUserProvider;
import com.blockout.matches.match.live.application.CurrentUserSnapshot;
import com.blockout.matches.usersclient.api.UserAccountsClient;
import com.blockout.matches.usersclient.model.UserAccountInternalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("generatedCurrentUserAdapter")
@RequiredArgsConstructor
public class GeneratedCurrentUserAdapter implements CurrentUserProvider {

    private final UserAccountsClient users;

    @Override
    public CurrentUserSnapshot getCurrentUser() {
        UserAccountInternalResponse user = users.getCurrentUser();
        return user == null ? null : new CurrentUserSnapshot(user.getAuth0Id(), user.getCreatedAt());
    }
}
