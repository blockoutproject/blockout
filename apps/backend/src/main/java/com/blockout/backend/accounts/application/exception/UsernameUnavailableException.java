package com.blockout.backend.accounts.application.exception;

/** Refuses a case-insensitive username collision without exposing the other account. */
public class UsernameUnavailableException extends RuntimeException {}
