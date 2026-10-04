# Checklist de revue fonctionnelle : suivis et calendrier personnel

**Objectif** : Revue approfondie de la qualité des exigences F06 par le relecteur de la PR et lors de la revue globale.

**Créée le** : 2026-09-20

**Fonctionnalité** : [Spécification F06](../spec.md)

**Note** : Checklist produite avec le skill officiel `speckit-checklist` à partir des décisions approuvées.

**Responsabilité** : Le relecteur est responsable des cases. `[x]` indique un critère de qualité des exigences relu et satisfait, pas une fonctionnalité implémentée.

## Périmètre et identité

- [ ] CHK001 Les acteurs, prérequis de compte et absence de condition Pro sont-ils explicites ? [Qualité des exigences, Spec §FR-001–FR-002, A01]

- [ ] CHK002 Le périmètre équipes/poules exclut-il le suivi de club et les relations implicites ? [Qualité des exigences, Spec §FR-001, FR-005, A02]

- [ ] CHK003 L’unicité et les demandes déjà satisfaites sont-elles définies pour ajout et retrait ? [Qualité des exigences, Spec §FR-003–FR-004, A03–A04]

- [ ] CHK004 Corrections, anciennes saisons et renouvellement manuel respectent-ils F02 ? [Qualité des exigences, Spec §FR-006–FR-007, A05]

- [ ] CHK005 La connexion invitée est-elle distincte de l’exécution du suivi selon F05 ? [Qualité des exigences, Spec §FR-002, A01]

## Saison et navigation

- [ ] CHK006 La portée commune aux trois écrans et deux listes est-elle explicite ? [Qualité des exigences, Spec §FR-008, A08]

- [ ] CHK007 L’indépendance vis-à-vis des filtres F03/F04 est-elle spécifiée ? [Qualité des exigences, Spec §FR-008, A08]

- [ ] CHK008 Les saisons proposées, leur déduplication et Toutes les saisons sont-ils définis ? [Qualité des exigences, Spec §FR-008–FR-009, A07–A09]

- [ ] CHK009 Le défaut parmi les suivis consultables puis le catalogue couvre-t-il aussi l’absence de saison ? [Qualité des exigences, Spec §FR-009–FR-010, A07]

- [ ] CHK010 L’ajout dans une autre saison conserve-t-il explicitement la sélection ? [Qualité des exigences, Spec §FR-011, A10]

- [ ] CHK011 Réinitialisation, retour de fiche et nouvelle saison publiée ont-ils des résultats distincts ? [Qualité des exigences, Spec §FR-010, FR-015, A11]

- [ ] CHK012 Une sélection disparue est-elle distinguée d’une panne de récupération ? [Qualité des exigences, Spec §FR-012, A12]

## Listes et visibilité

- [ ] CHK013 L’ordre alphabétique, les homonymes et leur contexte sont-ils définis ? [Qualité des exigences, Spec §FR-013, A13]

- [ ] CHK014 L’accès complet aux suivis est-il exigé sans plafond implicite ? [Qualité des exigences, Spec §FR-014, A13]

- [ ] CHK015 Le masquage exclut-il toute section, ancienne carte ou commande de retrait visible ? [Qualité des exigences, Spec §FR-016, A14]

- [ ] CHK016 La conservation des relations et leur réapparition sans doublon sont-elles explicites ? [Qualité des exigences, Spec §FR-006, FR-016, A15]

- [ ] CHK017 Les saisons uniquement liées à des suivis masqués et les états vides sont-ils traités sans fuite ? [Qualité des exigences, Spec §FR-009, FR-016–FR-017, A16]

- [ ] CHK018 Le retrait du dernier suivi et la suppression de compte sont-ils distingués du masquage sportif ? [Qualité des exigences, Spec §FR-004, FR-012, Hypothèses]

## Fil et compteurs

- [ ] CHK019 L’union des rencontres des équipes et poules reste-t-elle sans relation implicite, avec une sélection et une déduplication qui excluent tout match retiré, même avec résultat ou plusieurs suivis, et distinguent premier vide, second vide qualifié, panne et réapparition autorisée ? [Qualité des exigences, Spec §FR-005, FR-016, FR-018–FR-019, A18]

- [ ] CHK020 La déduplication et le retrait du dernier suivi sélectionnant un match ont-ils des critères explicites ? [Qualité des exigences, Spec §FR-019, A18–A19]

- [ ] CHK021 Les règles F03 de temps local, date inconnue et résultat absent sont-elles réutilisées sans contradiction ? [Qualité des exigences, Spec §FR-021, A20]

- [ ] CHK022 Compteur d’abonnés, quantité affichée, valeur inconnue et masquage ont-ils des sens distincts ? [Qualité des exigences, Spec §FR-020, A22]

- [ ] CHK023 L’absence de calendrier personnel de substitution est-elle explicite ? [Qualité des exigences, Spec §FR-017–FR-018, A17]

## Erreurs et qualité commune

- [ ] CHK024 Succès confirmé, refus certain et réponse perdue sont-ils distingués ? [Qualité des exigences, Spec §FR-024, A23–A24]

- [ ] CHK025 L’échec de récupération après succès est-il distingué d’une annulation ? [Qualité des exigences, Spec §FR-025, A25]

- [ ] CHK026 Les étapes relations/ressources/matchs et leurs reprises sont-elles distinguées ? [Qualité des exigences, Spec §FR-022, A26]

- [ ] CHK027 Les réponses obsolètes, reprises et changements de compte ont-ils des règles de cohérence ? [Qualité des exigences, Spec §FR-023, A03, A06, A21]

- [ ] CHK028 La frontière F07 empêche-t-elle de transformer le filtre en préférence de notification ? [Qualité des exigences, Spec §FR-027, A27]

- [ ] CHK029 Confidentialité, publicité, accessibilité et objectifs F13 restent-ils attribués à leurs propriétaires ? [Qualité des exigences, Spec §FR-026, FR-028, A28]

## Traçabilité et acceptation

- [ ] CHK030 Les critères mesurables couvrent-ils toutes les familles de parcours et exigences ? [Qualité des exigences, Spec §SC-001–SC-006]

- [ ] CHK031 Les preuves V1 sont-elles distinguées de l’intention V2 sans prétendre corriger le code ? [Qualité des exigences, Spec §Éléments probants et traçabilité]

- [ ] CHK032 Les dépendances F14/R01/R02 et les limites de livraison sont-elles explicites ? [Qualité des exigences, Spec §Hypothèses, Dépendances entre périmètres]

## Notes

- Les cases restent non cochées jusqu’à la revue ; ajouter les observations près du critère concerné.
- `speckit-implement` lit ces cases sans les modifier. `requirements.md` suit le cycle distinct Specify/Clarify.
- Cette revue ne remplace ni les futurs essais, ni R01/R02, ni l’acceptation globale sous #247.
