# Checklist de qualité de la spécification : publicité, confidentialité et documents légaux

**Objectif** : Valider la complétude et la qualité des exigences avant la revue fonctionnelle globale

**Créée le** : 2026-09-18

**Fonctionnalité** : [Spécification F11](../spec.md)

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

- Cette validation Specify/Clarify concerne la rédaction, pas un comportement livré, une mesure de production ou une certification juridique. FR-001–FR-037 sont couvertes par A01–A27 et SC-001–SC-008.
- La revue de clarification couvre périmètre, rôles, entités, transitions, erreurs, dépendances, confidentialité, terminologie et critères de résultat. Les réponses déjà approuvées sont intégrées aux exigences sans nouveau journal de clarification.
- Le compteur commun, l’échec sans remise à zéro, les parcours exclus, les droits inconnus, l’absence d’âge et de personnalisation, l’édition légale existante et le traitement des restrictions ont des résultats distincts. Les délais techniques de reprise ne sont pas copiés de la V1 ; une issue de reprise sans attente indéfinie est exigée.
- Le circuit GitHub et le traitement manuel par e-mail sont des choix explicites de l’opérateur ; ils ne sélectionnent pas la structure des contrats, le stockage des pièces ou la diffusion des notifications secondaires. Les références au code et aux fournisseurs sont des preuves délimitées, pas une architecture V2.
- La conservation des issues n’ajoute aucun délai automatique ni purge périodique. Les demandes individuelles applicables et la protection des copies restent requises ; aucune durée de journalisation ou conservation active n’est déduite des sauvegardes.
- F05/F09/F10 restent propriétaires de leurs parcours détaillés. Les règles communes, destinataires et critères de conservation sont explicites sans inventer de durées par domaine ; les paramètres effectifs et l’information légale doivent être qualifiés avant publication.
- La [checklist de revue publicité et confidentialité](advertising-privacy-legal.md) relève du relecteur ; ses cases restent non cochées à la génération.
- La rédaction de F11 n’autorise ni plan technique, ni tâches d’implémentation, ni nouvelle revue Figma par périmètre. L’acceptation du corpus sous #247 reste nécessaire.

- FR-033, A23 et SC-007 définissent l’envoi entier F10, la réconciliation des effets intermédiaires et l’indépendance de l’alerte secondaire ; aucun dossier incomplet ne vaut acceptation. La checklist du relecteur conserve ses cases non cochées.
