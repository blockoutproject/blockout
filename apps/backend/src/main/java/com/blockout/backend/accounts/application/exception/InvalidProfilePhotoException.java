package com.blockout.backend.accounts.application.exception;

/** Refuses unreadable or spoofed image content without exposing source information. */
public class InvalidProfilePhotoException extends RuntimeException {}
