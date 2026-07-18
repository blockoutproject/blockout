package com.blockout.matches.match.live.security;

import com.blockout.matches.match.live.application.MatchLiveAuthorizationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextMatchLiveAuthorizationProvider implements MatchLiveAuthorizationProvider {

    private static final String MODERATION_SCOPE = "SCOPE_moderate:match_live_link";

    @Override
    public boolean isModerator() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (MODERATION_SCOPE.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
