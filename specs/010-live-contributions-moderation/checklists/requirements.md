# Checklist de qualité de la spécification : contributions de liens de diffusion et modération

**Objectif** : Valider la complétude et la qualité des exigences avant la revue fonctionnelle globale

**Créée le** : 2026-09-22

**Fonctionnalité** : [Spécification F08](../spec.md)

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

- La revue Specify/Clarify couvre FR-001–FR-041, A01–A40 et SC-001–SC-007. Les cases portent sur la qualité des exigences écrites, pas sur une implémentation, une qualification de production ou une approbation de PR.
- Les décisions sont intégrées directement : publication avant/après résultat définitif, maintien de l’ancien actif pendant l’attente, quotas communs comptant tous les matchs de la journée de Paris, suspension avec heure inconnue, attente pour tous après masquage, nouveau compteur après réactivation, gestion de sa proposition, plateformes et caducité des autres propositions.
- La couverture comprend permissions, identité, transitions, dates et fuseaux, quotas, signalements, concurrence, incertitude, confidentialité, accessibilité et frontières entre périmètres. A12/A16 distinguent la correction sportive seule, la nouvelle version admissible immédiatement ou en attente, et le refus conservant la proposition précédente. Chaque exigence possède des références dans les scénarios ; aucun marqueur métier non résolu ne subsiste.
- Les observations V1 et leurs limites restent dans le registre de preuves. Auth0 et les plateformes nommées sont des contraintes produit ; aucune architecture, API ou projection de stockage V2 n’est choisie.
- La [checklist de relecture F08](live-contributions-moderation.md) comprend 34 questions sous la responsabilité du relecteur, laissées non cochées.
- Aucun code, contrat, plan technique, tâche ou maquette n’est livré. R01/R02 et l’acceptation globale sous #247 restent des prérequis ; les dépendances F07/F10/F12/F14 ne sont pas déclarées terminées.
