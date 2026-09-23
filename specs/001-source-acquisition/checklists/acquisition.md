<a id="acquisition-checklist-source-acquisition-and-observation-reliability"></a>

# Checklist d’acquisition : acquisition des sources et fiabilité des observations

**Objectif** : Examiner la complétude, la clarté et la cohérence des exigences d’acquisition des sources avant l’acceptation de la spécification fonctionnelle.

**Créée le** : 2026-09-15

**Fonctionnalité** : [Spécification d’acquisition des sources](../spec.md)

**Note** : Cette checklist personnalisée est générée par la compétence officielle `speckit-checklist` à partir du périmètre approuvé d’acquisition des sources.

**Responsabilité de la revue** : Ce document de revue de qualité des exigences relève du relecteur. Un élément ne doit être marqué `[x]` que lorsque le relecteur estime le critère satisfait.

**Sens des marqueurs** : `[x]` signifie que la qualité des exigences a été examinée et jugée satisfaisante ; cela ne signifie pas que l’implémentation est terminée.

<a id="requirement-completeness"></a>

## Complétude des exigences

- [ ] CHK001 Les sources prises en charge, la conservation de l’acquisition CSV, les cinq exclusions et les limites excluant les compétitions sans rapport sont-elles explicites ? [Complétude, Spécification §FR-001–FR-003]
- [ ] CHK002 La couverture de toutes les phases des trois championnats professionnels est-elle explicitement distinguée du comportement V1 observé et des échantillons de disponibilité future ? [Complétude, Spécification §FR-002, §Éléments probants et traçabilité des décisions]
- [ ] CHK003 La détection, l’activation, l’activité simultanée de plusieurs saisons, la clôture et la recollecte historique sont-elles spécifiées séparément ? [Complétude, Spécification §FR-007, §FR-046–FR-049]
- [ ] CHK004 La classification native des packs, les dérogations individuelles, l’attente de classification, l’exclusion explicite et la priorité de l’exclusion du pack sont-elles toutes décrites ? [Complétude, Spécification §FR-008–FR-010]
- [ ] CHK005 La transmission des observations définit-elle contexte, instants, références natives, valeurs, périmètre, complétude et motifs sans choisir une conception de transport ou de stockage ? [Complétude, Spécification §FR-021–FR-023]

<a id="requirement-clarity"></a>

## Clarté des exigences

- [ ] CHK006 Un catalogue exploitable se distingue-t-il d’une réponse HTTP réussie, d’une page d’erreur, d’une lecture partielle et d’un catalogue réellement vide ? [Clarté, Spécification §FR-004]
- [ ] CHK007 L’arrêt immédiat de collecte d’une source après absence confirmée au catalogue est-il distingué de la poursuite d’utilisation de références valides de la même saison pendant un échec de découverte et de la visibilité F02 ? [Clarté, Spécification §FR-005–FR-006, §FR-019]
- [ ] CHK008 La réutilisation des dernières références connues est-elle limitée à une découverte antérieure réussie dans la même saison et à l’éligibilité actuelle, avec fin sur absence confirmée, sans références inventées ni recours à une ancienne configuration ? [Clarté, Spécification §FR-006, §FR-031, §FR-034]
- [ ] CHK009 L’invalidité globale d’un calendrier, les anomalies isolées de matchs, l’invalidité de champs secondaires et les informations normalement manquantes ou de places futures sont-elles distinguées ? [Clarté, Spécification §FR-011–FR-016]
- [ ] CHK010 Les observations contradictoires d’une même source sont-elles distinguées des répétitions identiques, de la réutilisation de codes entre saisons et des priorités fournisseur ? [Clarté, Spécification §FR-013, §A09]
- [ ] CHK011 Les fenêtres de cadence, le début inconnu, le début corrigé, les dépassements et les échéances planifiées sont-ils spécifiés sans fausse promesse de fraîcheur de publication ? [Clarté, Spécification §FR-030–FR-031, §FR-035]

<a id="requirement-consistency"></a>

## Cohérence des exigences

- [ ] CHK012 L’indépendance entre calendriers, classements et fournisseurs et la préservation de l’état antérieur sont-elles compatibles avec les entrées partielles exploitables et l’interdiction des retraits fondés sur l’absence après traitement incomplet ? [Cohérence, Spécification §FR-012, §FR-017–FR-020]
- [ ] CHK013 Les calendriers vides valides sont-ils distingués des réponses invalides, sans incident spécifique, avec deux confirmations planifiées de la même autorité et des règles explicites de première observation, interruption par cette autorité, absence d’effet des observations ou échecs indépendants secondaires et reprise ? [Cohérence, Spécification §FR-019–FR-020, §A13 ; F02 §FR-019]
- [ ] CHK014 Réussite de l’acquisition, échec d’intégration et déclarations de mise à jour des données de l’application sont-ils séparés de façon cohérente ? [Cohérence, Spécification §FR-022, §FR-039, §FR-043]
- [ ] CHK015 Les réglages fiables de début de cycle et les changements de division ou classification au cycle suivant sont-ils distincts de la réutilisation autorisée des références et de la classification publiée conservée, sans reprise de collecte après restauration refusée ? [Cohérence, Spécification §FR-006, §FR-008, §FR-033–FR-034, §A06]
- [ ] CHK016 La relance uniquement par famille, l’absence d’exécutions en double et l’absence de levée implicite de pause sont-elles cohérentes dans les commandes de compétitions, clubs et géocodage ? [Cohérence, Spécification §FR-028, §FR-032–FR-036]

<a id="scenario-and-recovery-coverage"></a>

## Couverture des scénarios et de la reprise

- [ ] CHK017 L’échec d’une page club et un géocodage réussi mais vide ou ambigu sont-ils distingués d’un échec technique, avec des conséquences explicites sur les nouvelles tentatives ? [Couverture, Spécification §FR-024–FR-029, §A19–A22]
- [ ] CHK018 Le géocodage suit-il la localité effective F02 après corrections et restrictions, et sa relance manuelle inclut-elle les adresses inchangées non résolues tout en excluant le recalcul inutile des résultats valides ? [Couverture, Spécification §FR-026–FR-028, §A20–A21 ; F02 §A36–A38]
- [ ] CHK019 Les séquences distinguent-elles le seuil technique de trois échecs du seuil de deux calendriers vides, les tentatives HTTP, relances manuelles, cycles non exécutés et le rétablissement réel d’un incident technique ? [Couverture, Spécification §FR-020, §FR-041, §FR-043, §A13, §A29–A30]
- [ ] CHK020 Les seuils d’incident immédiat pour anomalie structurelle, à trois cycles et à 24 heures sont-ils distincts et cohérents avec la cadence normale des sources ? [Couverture, Spécification §FR-040–FR-042]
- [ ] CHK021 Le rétablissement réel est-il défini par des éléments exploitables du périmètre concerné, en excluant pause, exclusion, clôture de saison et succès sans rapport ? [Couverture, Spécification §FR-043, §A30]
- [ ] CHK022 La persistance des incidents, les notifications limitées à l’ouverture et au rétablissement et les signalements regroupés de nouveautés ou besoins de classification sont-ils spécifiés sans imposer une nouvelle plateforme d’incident ? [Couverture, Spécification §FR-044–FR-045]
- [ ] CHK023 L’éligibilité historique des saisons et références et l’exécution pendant une pause de collecte courante sont-elles distinguées de la collecte normale, tout en conservant les exigences de classification, d’exclusion, de permission, de validation et de compte rendu des lacunes d’archives, sans retrait total sur vide exceptionnel répété d’une saison clôturée ni interdiction des corrections par un calendrier complet non vide ? [Couverture, Spécification §FR-008, §FR-020, §FR-046–FR-049, §A34–A36]

<a id="acceptance-criteria-quality"></a>

## Qualité des critères d’acceptation

- [ ] CHK024 Chaque exigence fonctionnelle est-elle couverte par des scénarios concrets, notamment le comptage des cycles, les contradictions locales de matchs, les résultats partiels et le rétablissement réel ? [Traçabilité, Spécification §Couverture de l’inventaire, §A08–A09, §A29–A30]
- [ ] CHK025 Les critères de réussite sont-ils mesurables comme résultats utilisateur ou opérateur avec des hypothèses explicites de fournisseur, configuration et cadence ? [Mesurabilité, Spécification §SC-001–SC-008, §Hypothèses]
- [ ] CHK026 Les scénarios principaux, d’exception, de refus, de données vides ou partielles et de reprise sont-ils représentés sans prétendre que les tests d’acceptation V2 ont déjà été exécutés ? [Couverture, Spécification §Scénarios utilisateurs et validation, §Cas limites]

<a id="dependencies-privacy-and-scope"></a>

## Dépendances, confidentialité et périmètre

- [ ] CHK027 Les permissions sont-elles explicites et distinctes de l’autorité du modérateur des directs, tandis que leur attribution reste dans F12 ? [Complétude, Spécification §FR-038, §Dépendances entre périmètres]
- [ ] CHK028 Les observations utiles et métadonnées de diagnostic sont-elles distinguées des archives brutes et des données personnelles interdites dans les diagnostics, avec conservation attribuée à F11/F13 ? [Cohérence, Spécification §FR-021–FR-023, §FR-025]
- [ ] CHK029 Chaque décision interdomaines non résolue a-t-elle un responsable identifié et une entrée ou contrainte F01 définie, plutôt que d’être laissée à l’implémenteur ? [Dépendances, Spécification §Dépendances entre périmètres]
- [ ] CHK030 Les limites d’examen des sources, les changements V2 explicites, les considérations de modèle partagé, les suites Figma et le jalon du corpus complet sont-ils énoncés sans imposer d’architecture technique ? [Périmètre, Spécification §Hypothèses, §Éléments probants et traçabilité des décisions, §Dépendances entre périmètres]

## Notes

- Cette checklist examine la rédaction, pas le bon fonctionnement du logiciel. Tous les marqueurs nouvellement générés sont volontairement non cochés.
- Ajouter les constats du relecteur à proximité des éléments concernés et relier l’exigence ou le scénario pertinent.
- `speckit-implement` utilise l’état de la checklist comme condition de passage et ne doit pas modifier les marqueurs.
- [requirements.md](requirements.md) suit le cycle de vie intégré distinct maintenu par Specify et Clarify.
