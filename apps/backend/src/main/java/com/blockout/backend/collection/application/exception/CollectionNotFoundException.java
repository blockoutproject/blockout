package com.blockout.backend.collection.application.exception;

/** Missing current collection context; old cycles have no history-retention guarantee. */
public class CollectionNotFoundException extends RuntimeException {}
