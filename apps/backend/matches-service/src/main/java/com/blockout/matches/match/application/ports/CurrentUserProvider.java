package com.blockout.matches.match.application.ports;

import com.blockout.matches.match.application.views.CurrentUserView;

public interface CurrentUserProvider {
    CurrentUserView getCurrentUser();
}
