# Checklist de qualité de la spécification : notifications, boîte personnelle et livraison

**Objectif** : Valider la complétude et la qualité des exigences avant la revue fonctionnelle globale

**Créée le** : 2026-09-22

**Fonctionnalité** : [Spécification F07](../spec.md)

## Qualité du contenu

- [x] Aucun détail d’implémentation imposé (langages, frameworks, API)
- [x] Centrée sur la valeur utilisateur et les besoins métier
- [x] Rédigée pour des parties prenantes non techniques
- [x] Toutes les sections obligatoires sont complétées

## Complétude des exigences

- [x] Aucun marqueur [NEEDS CLARIFICATION] ne subsiste
- [x] Les exigences sont vérifiables et non ambiguës
- [x] Les critères de réussite sont mesurables
- [x] Les critères de réussite sont indépendants des technologies
- [x] Tous les scénarios d’acceptation sont définis
- [x] Les cas limites sont identifiés
- [x] Le périmètre est clairement délimité
- [x] Les dépendances et hypothèses sont identifiées

## Maturité de la spécification

- [x] Toutes les exigences fonctionnelles ont des critères d’acceptation clairs
- [x] Les scénarios utilisateurs couvrent les parcours principaux
- [x] Les résultats attendus sont vérifiables par les critères de réussite
- [x] Aucun détail d’implémentation ne se glisse dans les règles fonctionnelles

## Notes

- La validation rédactionnelle porte sur FR-001–FR-042, A01–A43 et SC-001–SC-006, avec une couverture explicite des décisions approuvées : découverte déjà terminée silencieuse, résultat enrichi, rediffusion tardive, lecture unique, badges et reprises de 15 minutes.
- Les cases évaluent uniquement la qualité des exigences. Elles ne certifient ni implémentation, ni réception de push, ni migration, ni conception approuvée.
- Les preuves V1 sont isolées des résultats V2 attendus ; aucune API, solution de stockage ou architecture n’est prescrite.
- La [checklist de relecture](notifications-delivery.md) appartient au relecteur et reste non cochée. R01/R02 et l’acceptation globale sous #247 précèdent la planification technique.

- La passe Specify/Clarify ne relève aucune décision fonctionnelle critique manquante : périmètre, identités, transitions, parcours, erreurs, qualité et dépendances sont définis. Les choix techniques et visuels restent réservés à leurs phases ; les 35 questions de relecture demeurent non cochées.

- FR-024–FR-026, A26–A28/A37 et SC-004 distinguent la suspension des push en maintenance F12 de la création des entrées, sans exception opérateur ni extension des quinze minutes. Cette validation reste documentaire ; les cases du relecteur sont inchangées.
