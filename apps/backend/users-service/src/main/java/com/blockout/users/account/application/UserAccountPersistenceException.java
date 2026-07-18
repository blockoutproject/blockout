package com.blockout.users.account.application;

/** Keeps persistence implementation failures outside account application contracts. */
public class UserAccountPersistenceException extends RuntimeException {

    public UserAccountPersistenceException(Throwable cause) {
        super(cause);
    }
}
