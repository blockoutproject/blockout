# Checklist de revue fonctionnelle : recherche et découverte

**Objectif** : Revue approfondie de la qualité des exigences F04, pour le relecteur de la PR et la revue globale.

**Créée le** : 2026-09-19

**Fonctionnalité** : [Spécification F04](../spec.md)

**Note** : Checklist produite avec le skill officiel `speckit-checklist` à partir du périmètre approuvé.

**Responsabilité** : Le relecteur est seul responsable des cases. `[x]` indique une exigence relue et jugée de qualité suffisante, pas une fonctionnalité implémentée.

## Complétude du périmètre

- [ ] CHK001 Les trois types de ressources, acteurs publics et exclusions du périmètre sont-ils explicites ? [Qualité des exigences, Spec §FR-001, A01]
- [ ] CHK002 Les champs recherchables sont-ils définis pour chaque type sans dépendre du moteur V1 ? [Qualité des exigences, Spec §FR-006, A05–A06]
- [ ] CHK003 La portée des noms publics, sources et alias vérifiés est-elle bornée par F02 ? [Qualité des exigences, Spec §FR-010, A09–A10]
- [ ] CHK004 Les quatre filtres et leur combinaison avec tous les termes sont-ils explicités ? [Qualité des exigences, Spec §FR-008, FR-011–FR-013, A07, A12]
- [ ] CHK005 Les règles de signalement et les interfaces F10/F11 sont-elles conservées sans collecte ajoutée ? [Qualité des exigences, Spec §FR-029, A29]

## Clarté des choix et transitions

- [ ] CHK006 La saison automatique est-elle distinguée d’un choix explicite de même valeur ? [Qualité des exigences, Spec §FR-002, FR-004, A02–A04]
- [ ] CHK007 L’effet de l’effacement du texte, de la réinitialisation des filtres et de leur combinaison est-il défini ? [Qualité des exigences, Spec §FR-005, A04]
- [ ] CHK008 La stabilité des exemples pendant une visite est-elle bornée par la visibilité et distinguée de leur variation entre visites ? [Qualité des exigences, Spec §FR-003, A03]
- [ ] CHK009 La saison la plus récente disponible, les saisons futures et Toutes les saisons sont-elles définies sans année fixe ? [Qualité des exigences, Spec §FR-012, A11]
- [ ] CHK010 La portée du texte commun et des filtres propres à chaque onglet est-elle non ambiguë ? [Qualité des exigences, Spec §FR-014, A13]
- [ ] CHK011 La restauration de contexte et ses limites lorsque les données changent sont-elles explicites ? [Qualité des exigences, Spec §FR-015, A14, A22]
- [ ] CHK012 Une sélection disparue est-elle distinguée d’un échec de récupération des choix ? [Qualité des exigences, Spec §FR-016, A15]

## Cohérence et identité

- [ ] CHK013 La tolérance aux accents et fautes est-elle distincte des règles d’identité F02 ? [Qualité des exigences, Spec §FR-007, FR-009–FR-010, A08–A09]
- [ ] CHK014 Les correspondances approchantes restent-elles soumises à tous les filtres et termes ? [Qualité des exigences, Spec §FR-008–FR-011, A07–A08]
- [ ] CHK015 La distinction entre plusieurs alias d’une identité et plusieurs identités homonymes est-elle explicite ? [Qualité des exigences, Spec §FR-019, A09, A19]
- [ ] CHK016 Les cas club sans équipe visible, équipe sans participation et saison terminée respectent-ils F02 ? [Qualité des exigences, Spec §FR-012, FR-020, A16]
- [ ] CHK017 Exclusion, division inactive, retrait et réapparition restent-ils soumis aux restrictions indépendantes F02 ? [Qualité des exigences, Spec §FR-020, A20–A21]
- [ ] CHK018 La navigation cible-t-elle une identité sans rapprochement implicite, avec l’indisponibilité F03 ? [Qualité des exigences, Spec §FR-027, A20]

## Ordre, mesure et exhaustivité

- [ ] CHK019 L’ordre alphabétique sans texte est-il distingué de la pertinence avec texte et des exemples ? [Qualité des exigences, Spec §FR-003, FR-017, A18]
- [ ] CHK020 Le départage stable est-il défini sans masquer les homonymes ni imposer une architecture ? [Qualité des exigences, Spec §FR-017–FR-019, A17–A19]
- [ ] CHK021 L’accès au-delà de vingt résultats est-il exigé pour le texte comme pour les filtres seuls ? [Qualité des exigences, Spec §FR-004, FR-018, A04, A17]
- [ ] CHK022 La quantité chargée, le total éventuel et la fin de liste ont-ils des sens distincts ? [Qualité des exigences, Spec §FR-022, A17, A25]
- [ ] CHK023 Les critères de réussite sont-ils mesurables et reliés aux exigences et scénarios ? [Qualité des exigences, Spec §SC-001–SC-007]
- [ ] CHK024 La stabilité du parcours sur données inchangées et la reprise après évolution sont-elles distinguées ? [Qualité des exigences, Spec §FR-019, FR-025–FR-026, A22]

## Erreurs et situations limites

- [ ] CHK025 L’absence réelle, l’échec initial et une réponse partielle vide sont-ils distingués ? [Qualité des exigences, Spec §FR-022–FR-024, A23–A25]
- [ ] CHK026 Les reprises après échec initial, actualisation et lot suivant sont-elles spécifiées sans fausse fin ? [Qualité des exigences, Spec §FR-022, FR-024, A23–A24]
- [ ] CHK027 La conservation de résultats autorisés est-elle subordonnée aux restrictions connues et à une fraîcheur honnête ? [Qualité des exigences, Spec §FR-020, FR-024, FR-026, A21, A24, A27]
- [ ] CHK028 Les réponses tardives et anciens lots sont-ils empêchés de modifier un contexte plus récent ? [Qualité des exigences, Spec §FR-025, A22, A26]

## Exigences communes et dépendances

- [ ] CHK029 Les objectifs F13 et l’accessibilité sont-ils référencés sans nouveau seuil local ? [Qualité des exigences, Spec §FR-026, FR-030, A27, A29]
- [ ] CHK030 Accès public, droits inconnus, isolation de compte et publicité restent-ils cohérents avec F05/F09/F11 ? [Qualité des exigences, Spec §FR-028, A01, A28]
- [ ] CHK031 Les preuves V1 et choix V2 sont-ils distingués sans présenter les scénarios comme une réalisation ? [Qualité des exigences, Spec §Éléments probants et traçabilité]
- [ ] CHK032 Les hypothèses et dépendances R01/R02/F14 bornent-elles la livraison sans anticiper la conception technique ? [Qualité des exigences, Spec §Hypothèses, Dépendances entre périmètres]

## Notes

- Laisser les cases non cochées jusqu’à l’évaluation du relecteur ; ajouter les observations près du critère concerné.
- `speckit-implement` lit les cases mais ne les modifie pas. La checklist `requirements.md` suit le cycle distinct Specify/Clarify.
- Cette revue porte sur les documents ; elle ne remplace ni les futurs tests, ni R01/R02, ni l’acceptation globale.
