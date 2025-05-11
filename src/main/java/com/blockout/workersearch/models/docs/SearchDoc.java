package com.blockout.workersearch.models.docs;


/**
 * Contrat minimal pour qu’un document sache :
 *  – dans quel index il vit                 → {@code index()}
 *  – quelle clé utiliser pour l’upsert bulk → {@code id()}
 */
public interface SearchDoc {
    String index();
    String id();
}