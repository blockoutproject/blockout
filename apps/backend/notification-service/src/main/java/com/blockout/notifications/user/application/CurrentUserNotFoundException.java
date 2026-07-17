package com.blockout.notifications.user.application;

/** Signals that the authenticated identity has no resolvable local user. */
public class CurrentUserNotFoundException extends RuntimeException {

    public CurrentUserNotFoundException() {
        super("Utilisateur introuvable");
    }
}
