# Checklist de revue : consultation sportive et calendriers

**Objectif** : Évaluer la complétude, la précision et la cohérence des exigences F03, notamment temps, résultats absents, visibilité et données partielles.

**Créée le** : 2026-09-19

**Fonctionnalité** : [Spécification F03](../spec.md)

**Responsabilité** : Cette checklist appartient au relecteur. Une case cochée signifie que la qualité de l’exigence a été examinée et jugée satisfaisante ; elle ne certifie aucune implémentation, maquette ou qualification fournisseur.

## Fiches, accès et saisons

- [ ] CHK001 Les informations et relations des quatre fiches sont-elles définies sans perte d’une capacité V1 autorisée ? [Complétude, FR-002–FR-005, A01–A03]
- [ ] CHK002 Les valeurs inconnues, retirées et indisponibles sont-elles distinguées sans zéro, logo, contact ou identité de remplacement supposés ? [Clarté, FR-006, A03, A10]
- [ ] CHK003 La saison initiale, sa portée sur équipes/calendriers et son maintien ou remplacement sont-ils explicites, y compris pour une saison future déjà publiée ? [Précision, FR-007, A04]
- [ ] CHK004 Les relations indisponibles, anciens liens et retours de navigation respectent-ils l’identité et les restrictions courantes ? [Cohérence, FR-008, FR-018, A05, A29]
- [ ] CHK005 Les actions de suivi, compteurs, contribution, signalement et édition restent-elles attribuées à leur périmètre sans permission implicite ? [Périmètre, FR-001, FR-035, A06]

## Temps et visibilité

- [ ] CHK006 Source parisienne, instant établi et fuseau d’affichage sont-ils distingués avec des exemples vérifiables Paris/New York ? [Clarté, FR-009, A07]
- [ ] CHK007 Heures, groupes de jours et libellés relatifs utilisent-ils la même référence, y compris lors d’un changement d’heure ou de fuseau ? [Cohérence, FR-009, FR-018, A08]
- [ ] CHK008 Une date seule conserve-t-elle sa précision sans conversion ou faux instant, avec un traitement explicite de FFVB 00:00 ? [Couverture, FR-010, A09]
- [ ] CHK009 Le masquage d’un match sans date couvre-t-il toutes les surfaces publiques et les anciens liens, sans effacement des données ? [Complétude, FR-011, A10]
- [ ] CHK010 L’acquisition, le retrait explicite et la simple indisponibilité d’une date ont-ils des conséquences distinctes et cohérentes avec F02 ? [Cohérence, FR-006, FR-011, A10]
- [ ] CHK011 La borne de six heures est-elle une durée écoulée exacte, commune aux fuseaux et indépendante des changements d’heure ? [Mesurabilité, FR-012, A11]
- [ ] CHK012 La borne d’un match sans heure est-elle le lendemain à minuit Paris, sans lui attribuer un horaire sportif fictif ? [Mesurabilité, FR-010, FR-012, A12]
- [ ] CHK013 L’entrée dans « Terminés » distingue-t-elle clairement catégorie de calendrier et résultat sportif confirmé, sans nouvel onglet imposé ? [Clarté, FR-012–FR-013, tableau de décision]
- [ ] CHK014 Résultat définitif précoce, provisoire et absent ont-ils des présentations distinctes avant et après la borne ? [Couverture, FR-012–FR-013, FR-019, A13]
- [ ] CHK015 Report, résultat tardif, correction et retrait réévaluent-ils la présentation de la même identité sans annulation ou fin inventée ? [Transitions, FR-014, A14]
- [ ] CHK016 Le masquage des matchs retirés couvre-t-il résultats publics, anciens liens et suivis, sans republication par seuil temporel et avec réapparition sous réserve des restrictions F02 ? [Cohérence, FR-015, A15, dépendances F07/F08]

## Listes, résultats et cartes

- [ ] CHK017 L’ordre des jours, groupes, horaires connus, égalités et heures inconnues est-il défini sans tri sportif ajouté ? [Précision, FR-016, A16]
- [ ] CHK018 La pagination par journées couvre-t-elle reprise, groupes vides et réconciliation après changement de date/fuseau sans doublon ou omission durable ? [Couverture, FR-017–FR-018, A17]
- [ ] CHK019 Le résultat global reste-t-il distinct du détail invalide, des notations particulières et d’un zéro artificiel ? [Cohérence, FR-019, A03, A13–A14, F02]
- [ ] CHK020 Positions officielles, statistiques inconnues et lignes sans équipe consultable sont-elles définies sans rang dérivé de l’index ? [Exactitude, FR-020, A18]
- [ ] CHK021 La fraîcheur partielle et l’absence de classement sont-elles indépendantes du succès du calendrier ou d’une lecture de cache ? [Clarté, FR-021, A19]
- [ ] CHK022 La carte repose-t-elle sur les participations consultables plutôt que sur la présence d’un classement ou d’une correspondance supposée ? [Cohérence, FR-022, A20]
- [ ] CHK023 Localisation communale, coordonnées absentes/invalidées, carte partielle et panne cartographique sont-elles distinguées sans gymnase ou point inventé ? [Couverture, FR-023, A21]
- [ ] CHK024 Les équipes au même emplacement et les logos manquants restent-ils couverts sans déplacement géographique artificiel ni choix de maquette anticipé ? [Complétude, FR-024, A22]

## Liens, documents et reprise

- [ ] CHK025 Le libellé « Lien de diffusion » exclut-il toute promesse de direct/replay fondée seulement sur l’heure, le score ou l’existence du lien ? [Clarté, FR-025, A23]
- [ ] CHK026 Les conditions d’accès à la feuille d’information et à la feuille de match sont-elles distinctes, notamment après six heures sans score et après retrait d’un résultat ? [Cohérence, FR-026–FR-027, A24–A25]
- [ ] CHK027 Les parcours documentaires iOS/Android couvrent-ils absence, expiration connue, erreur non diagnostiquée, retour et reprise sans fournisseur de lecteur imposé ? [Couverture, FR-028, A26]
- [ ] CHK028 Chargement, absence réelle, erreur et données partielles ont-ils des résultats définis sans perte des informations encore autorisées ? [Complétude, FR-029, FR-031, A27]
- [ ] CHK029 Les déclencheurs d’actualisation et la propagation F13 sont-ils explicites sans promesse de publication fournisseur ou score continu ? [Mesurabilité, FR-030, A28, A33]
- [ ] CHK030 Les changements de contexte et restrictions courantes prévalent-ils sur les réponses retardées et anciennes données ? [Cohérence, FR-018, FR-031, A29, A31]
- [ ] CHK031 Toutes les consultations sportives publiques, dont les cartes des poules et les calendriers complets des clubs, sont-elles gratuites pour les invités et tous les états de droits, sans blocage Pro, attente de vérification ni invitation à acheter, tout en préservant la visibilité F02, les permissions F05 et les règles publicitaires F11 ? [Cohérence, FR-001, FR-031–FR-033, A30–A31]
- [ ] CHK032 L’accessibilité, la traçabilité V1/V2 et les états requis pour R02 sont-ils définis sans faire passer une preuve locale pour une qualification complète ? [Vérifiabilité, FR-034–FR-036, A32–A34]

## Notes

- Les marqueurs restent non cochés jusqu’à la revue. Ils ne mesurent pas l’avancement de l’implémentation ; `$speckit-implement` ne les modifie pas.
- La [checklist Specify/Clarify](requirements.md) suit son propre cycle de validation documentaire.
- Les contrats, mécanismes de pagination et de conversion, composants visuels et essais techniques seront dérivés après acceptation du corpus et la revue globale applicable.
