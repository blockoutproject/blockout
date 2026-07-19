package com.blockout.matches.match.application.ports;

import com.blockout.matches.match.application.views.MatchView;

public interface MatchEventPublisher {
    void publishMatchFinished(MatchView match);

    void publishMatchLiveLinkCreated(MatchView match);
}
