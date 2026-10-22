package com.blockout.backend.accounts.application.exception;

/** Refuses photo bytes exceeding the 5 MiB input or stored-output bound. */
public class ProfilePhotoTooLargeException extends RuntimeException {}
