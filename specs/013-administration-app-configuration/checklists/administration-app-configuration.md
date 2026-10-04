# Checklist de relecture : administration commune et configuration de l’accès

**Objectif** : Revue approfondie des exigences F12 avant acceptation fonctionnelle globale.

**Créée le** : 2026-09-23

**Fonctionnalité** : [Spécification F12](../spec.md)

**Propriété** : Les cases appartiennent au relecteur. Une case cochée signifie que le critère de qualité des exigences est examiné et satisfait, pas que le comportement est implémenté.

## Permissions et responsabilités

- [ ] CHK001 L’attribution automatique des seules capacités ordinaires conserve-t-elle les conditions de chaque domaine ? [Qualité des exigences, Spécification §FR-001, A01]
- [ ] CHK002 Le propriétaire du produit est-il distingué du propriétaire d’un compte et seul habilité à attribuer les privilèges ? [Qualité des exigences, Spécification §FR-002, A02, Acteurs]
- [ ] CHK003 Les trois permissions de maintenance, versions et contournement sont-elles indépendantes ? [Qualité des exigences, Spécification §FR-003, A03]
- [ ] CHK004 Chaque commande administrative conserve-t-elle un propriétaire fonctionnel unique, dont les pouvoirs réservés F09 ? [Qualité des exigences, Spécification §FR-004, A04, Couverture et dépendances]
- [ ] CHK005 Les droits absents, révoqués, inexploitables et les anciennes sessions ont-ils des conséquences explicites sans droit implicite ? [Qualité des exigences, Spécification §FR-005, A05, A16]

## Configuration et résultats d’enregistrement

- [ ] CHK006 La préparation du contenu est-elle séparée de l’activation, pour une maintenance active comme inactive ? [Qualité des exigences, Spécification §FR-006, A06]
- [ ] CHK007 Le message obligatoire, l’image facultative et son indisponibilité ont-ils des règles distinctes ? [Qualité des exigences, Spécification §FR-007, FR-031, A07–A08]
- [ ] CHK008 Les champs inchangés, retirés et les groupes de réglages indépendants sont-ils différenciés ? [Qualité des exigences, Spécification §FR-008, A09]
- [ ] CHK009 Les états de chargement et erreur excluent-ils des valeurs par défaut présentées comme publiées ? [Qualité des exigences, Spécification §FR-009, A10]
- [ ] CHK010 Les refus, échecs et rafraîchissements préservent-ils état accepté et saisie sans écrasement silencieux ? [Qualité des exigences, Spécification §FR-010, A10–A11]
- [ ] CHK011 L’incertitude et la concurrence exigent-elles relecture et résolution sans répétition aveugle ? [Qualité des exigences, Spécification §FR-011, A12]

## Maintenance et démarrage

- [ ] CHK012 Le blocage mobile et serveur est-il défini sans assimiler maintenance et effacement sportif ? [Qualité des exigences, Spécification §FR-012, A13, A18]
- [ ] CHK013 Les exceptions légales, assistance et authentification opérateur sont-elles explicites sans ouverture ordinaire implicite ? [Qualité des exigences, Spécification §FR-013, A14]
- [ ] CHK014 Le contournement est-il personnel, explicite, limité aux droits courants et sans exception de version ? [Qualité des exigences, Spécification §FR-014, A15–A16, A29]
- [ ] CHK015 Démarrage à froid et reprise explicite sont-ils distingués du retour au premier plan et de toute interrogation périodique ? [Qualité des exigences, Spécification §FR-015, A17]
- [ ] CHK016 Le refus serveur reçu en session est-il distingué du remplacement instantané d’un écran sans échange serveur ? [Qualité des exigences, Spécification §FR-016, A18]
- [ ] CHK017 Les cinq minutes bornent-elles le cache permissif au lancement sans renouvellement par usage ni minuterie de session ? [Qualité des exigences, Spécification §FR-017, A19]
- [ ] CHK018 L’absence d’état fiable et le maintien d’une restriction connue sont-ils distingués sans faux état de maintenance ? [Qualité des exigences, Spécification §FR-018, A20]
- [ ] CHK019 Les opérations courtes déjà acceptées sont-elles conservées sans système général de suspension ou d’annulation ? [Qualité des exigences, Spécification §FR-019, A21]
- [ ] CHK020 La maintenance conserve-t-elle l’indépendance des collectes et de leurs règles de pause F01 ? [Qualité des exigences, Spécification §FR-020, A22]

## Notifications et versions

- [ ] CHK021 La création des entrées est-elle conservée pendant la maintenance, sans remise à zéro des limites d’annonce ? [Qualité des exigences, Spécification §FR-021, A23]
- [ ] CHK022 La suspension des push couvre-t-elle les opérateurs et la reprise respecte-t-elle l’échéance initiale F07 ? [Qualité des exigences, Spécification §FR-022, A23–A25]
- [ ] CHK023 Les messages déjà remis gardent-ils des limites de rappel explicites et leur état de livraison ? [Qualité des exigences, Spécification §FR-023, A26]
- [ ] CHK024 Les seuils par plateforme et les cas inférieur, égal, supérieur et absent sont-ils définis ? [Qualité des exigences, Spécification §FR-024, A27]
- [ ] CHK025 L’ordre numérique, les seuils invalides et les versions installées inconnues excluent-ils toute valeur fictive ? [Qualité des exigences, Spécification §FR-025, A28]
- [ ] CHK026 L’absence d’exception opérateur de version et la priorité maintenance sont-elles cohérentes ? [Qualité des exigences, Spécification §FR-026–FR-027, A29–A30]
- [ ] CHK027 La vérification opérateur de publication est-elle distinguée d’une URL valide et d’un contrôle automatique des stores ? [Qualité des exigences, Spécification §FR-028, A31]
- [ ] CHK028 L’échec d’ouverture et l’ouverture réussie du store sont-ils distingués d’une installation effective ? [Qualité des exigences, Spécification §FR-029, A32]
- [ ] CHK029 Les corrections/retraits de seuils et les liens obligatoires préservent-ils les autres réglages ? [Qualité des exigences, Spécification §FR-030, A33]

## Secours, qualité et couverture

- [ ] CHK030 Le circuit de secours hors application est-il réservé au propriétaire et vérifiable sans console ou outil imposé ? [Qualité des exigences, Spécification §FR-032–FR-033, A34]
- [ ] CHK031 La disponibilité inclut-elle la maintenance et les diagnostics appliquent-ils F13 sans nouveau système d’audit ? [Qualité des exigences, Spécification §FR-034, A35]
- [ ] CHK032 Les contraintes F14 et états R02 sont-ils explicitement transmis sans implémentation, migration ou écran réputé approuvé ? [Qualité des exigences, Spécification §FR-035–FR-036, A35]
- [ ] CHK033 Les critères et tableaux couvrent-ils toutes les exigences, bornes et reprises sans confondre preuve V1 et comportement attendu ? [Qualité des exigences, Spécification §SC-001–SC-007, Couverture et dépendances, Éléments probants V1]

## Notes

- Générée selon `speckit-checklist`. Les marqueurs restent réservés au relecteur ; `speckit-implement` peut les lire sans les modifier.
- La checklist `requirements.md` possède le cycle rédactionnel distinct Specify/Clarify.
