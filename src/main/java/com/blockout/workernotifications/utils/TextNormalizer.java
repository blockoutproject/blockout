package com.blockout.workernotifications.utils;

import java.text.Normalizer;

public class TextNormalizer {

    public static String simplify(String input) {
        if (input == null) return "";
        
        return Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "") // Supprime les accents
            .toLowerCase()
            .replaceAll("[^a-z0-9 ]", "") // Supprime ponctuation
            .replaceAll("\\s+", " ")     // Normalise les espaces
            .trim();
    }

}