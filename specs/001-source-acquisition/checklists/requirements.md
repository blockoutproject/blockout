<a id="specification-quality-checklist-source-acquisition-and-observation-reliability"></a>

# Checklist de qualité de la spécification : acquisition des sources et fiabilité des observations

**Objectif** : Valider la complétude et la qualité de la spécification avant de passer à la planification

**Créée le** : 2026-09-15

**Fonctionnalité** : [Spécification d’acquisition des sources](../spec.md)

<a id="content-quality"></a>

## Qualité du contenu

- [x] Aucun détail d’implémentation (langages, frameworks, API)
- [x] Centrée sur la valeur utilisateur et les besoins métier
- [x] Rédigée pour des parties prenantes non techniques
- [x] Toutes les sections obligatoires sont complétées

<a id="requirement-completeness"></a>

## Complétude des exigences

- [x] Aucun marqueur [NEEDS CLARIFICATION] ne subsiste
- [x] Les exigences sont vérifiables et non ambiguës
- [x] Les critères de réussite sont mesurables
- [x] Les critères de réussite sont indépendants des technologies (aucun détail d’implémentation)
- [x] Tous les scénarios d’acceptation sont définis
- [x] Les cas limites sont identifiés
- [x] Le périmètre est clairement délimité
- [x] Les dépendances et hypothèses sont identifiées

<a id="feature-readiness"></a>

## Maturité de la spécification

- [x] Toutes les exigences fonctionnelles ont des critères d’acceptation clairs
- [x] Les scénarios utilisateurs couvrent les parcours principaux
- [x] La fonctionnalité satisfait les résultats mesurables définis dans les critères de réussite
- [x] Aucun détail d’implémentation ne se glisse dans la spécification

## Notes

- FR-026 utilise la localité effective définie par F02 après corrections et restrictions ; A19–A22 restent les scénarios de collecte de fiches et de géocodage, complétés par F02 A36–A38 pour les changements administratifs.

- Les calendriers vides valides ne constituent pas des incidents. A13/FR-020 définissent les deux confirmations planifiées de la même autorité, leurs interruptions et l’absence d’effet des observations ou échecs indépendants secondaires ; A29/FR-041 conservent séparément le seuil de trois échecs techniques. A34–A36/FR-047–FR-048 préservent les données autorisées face aux vides exceptionnels répétés d’une saison clôturée et aux archives inexploitables ; les corrections sur calendrier historique complet non vide restent possibles. F02 possède le masquage et la conservation interne.

- Il s’agit de la checklist de qualité intégrée à Specify/Clarify. Les éléments cochés concernent les exigences écrites, pas un comportement logiciel livré, une acceptation en production ou une autorisation de commencer l’implémentation.
- Les sources officielles nommées et la méthode CSV FFVB exigée par le responsable produit sont des contraintes de source. Les chemins du dépôt et les URL fournisseur datées sont des éléments probants, pas des choix d’architecture V2 ou de conception d’API.
- FR-001–FR-049 sont reliées à A01–A36 par la couverture de l’inventaire de la spécification et les références individuelles des scénarios ; SC-001–SC-008 définissent les résultats d’acceptation mesurables.
- La revue de clarification préserve les transmissions délimitées à F02/F03/F11/F12/F13/F14/R02 ; elle n’affirme pas que les autres spécifications sont complètes. Aucun marqueur de clarification F01 non résolu ne subsiste.
- La [checklist d’acquisition](acquisition.md) personnalisée reste sous la responsabilité du relecteur et non cochée à sa génération. Ses marqueurs ont un cycle de vie différent.
- Toutes les spécifications fonctionnelles et les revues globales de cohérence et de conception visuelle restent des prérequis à la planification technique sous #247. Une checklist de qualité rédactionnelle satisfaite ne contourne pas ce jalon.
