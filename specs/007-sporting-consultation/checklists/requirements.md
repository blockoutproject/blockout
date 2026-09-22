# Checklist de qualité de la spécification : consultation sportive et calendriers

**Objectif** : Valider la complétude et la qualité des exigences avant la revue fonctionnelle globale

**Créée le** : 2026-09-19

**Fonctionnalité** : [Spécification F03](../spec.md)

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

- FR-015/A15 exigent le masquage des matchs retirés, même avec résultat conservé en interne ou suivi. Le retrait d’un résultat seul reste distinct de celui du match ; la réapparition et les restrictions suivent F02.

- Cette validation Specify/Clarify porte sur la qualité des exigences, pas sur une implémentation, une validation Figma ou un essai fournisseur. FR-001–FR-036 sont reliées à A01–A34 et SC-001–SC-008.
- Les décisions sont directement intégrées : affichage dans le fuseau du téléphone, six heures écoulées ou minuit Paris pour une date seule, résultat indisponible dans « Terminés », masquage public sans date, distinction des documents et lien de diffusion neutre.
- F02 conserve la vérité sportive et les données ; une catégorie de calendrier ne devient ni un statut sportif ni un déclencheur F07/F08. Les relations et règles communes restent attribuées à F05/F06/F09/F10/F11/F12/F13.
- Les limites de données, permissions, cas d’erreur, transitions, critères mesurables et interfaces entre périmètres sont explicites. La stabilité de pagination et d’ordre est exigée sans choisir un contrat, une clé ou une architecture.
- La checklist [consultation sportive](sporting-consultation.md) appartient au relecteur et reste non cochée.
- Les sources V1 décrivent des comportements observés ; aucun exemple d’acceptation ne prétend prouver leur correction ou une V2 livrée. Les parcours seront qualifiés sur les plateformes et fuseaux concernés.
- Aucun plan technique ni tâche ne sont créés. R01/R02 et l’acceptation globale sous #247 précèdent les étapes techniques.
