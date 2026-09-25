# Checklist de relecture : notifications, boîte personnelle et livraison

**Objectif** : Examiner la complétude, la clarté et la cohérence des exigences F07 avant acceptation fonctionnelle globale

**Créée le** : 2026-09-22

**Fonctionnalité** : [Spécification F07](../spec.md)

**Responsabilité** : Checklist de qualité des exigences réservée au relecteur, préparée avec `speckit-checklist`. Une case cochée signifie que le critère rédactionnel a été examiné et satisfait ; elle ne signifie pas que le logiciel est implémenté ou validé. Les cases sont laissées non cochées à la génération.

## Complétude des déclencheurs et des destinataires

- [ ] CHK001 Le passage d’un match connu au résultat définitif est-il séparé de la découverte déjà terminée, du score provisoire et de la catégorie « Terminés », sans échéance H+4/H+6 ? [Clarté, FR-002–FR-003, A01–A04]
- [ ] CHK002 Les corrections, retraits et rétablissements préservent-ils explicitement identité, ordre et lecture sans nouvelle annonce ou résurrection ? [Cohérence, FR-004, FR-019, A05]
- [ ] CHK003 L’union des suivis confirmés exclut-elle les doublons et les demandes encore incertaines ? [Complétude, FR-011–FR-012, A06]
- [ ] CHK004 Les instants d’éligibilité, le retrait du dernier suivi, les envois partiels et le suivi tardif sont-ils délimités sans rattrapage implicite ? [Couverture, FR-012–FR-014, A07–A10]
- [ ] CHK005 L’annonce anticipée, l’heure inconnue et la correction d’horaire distinguent-elles visibilité du lien, déclenchement et échéance de livraison ? [Clarté, FR-005–FR-006, FR-025–FR-026, A09–A11]
- [ ] CHK006 Do enriched result and separate replay share one post-match allowance that survives retention purge or push failure, independently of the live allowance? [Consistency, FR-007–FR-009, FR-043, A12–A17, A47]
- [ ] CHK007 La priorité de l’avis enrichi est-elle explicite lorsque résultat et lien sont disponibles avant la création du résultat admissible, même si le lien est traité en premier, en concurrence ou après reprise ? [Couverture, FR-007–FR-009, FR-038, A12, A14]
- [ ] CHK008 La publication, l’approbation et la réactivation sont-elles distinctes des propositions privées, refus et répétitions sans changement ? [Complétude, FR-010, A15–A16]
- [ ] CHK009 La création dans la boîte distingue-t-elle résultat enrichi, résultat simple déjà créé avec push en attente et destinataire admissible seulement au nouveau lien, sans rattrapage, résurrection ou contournement d’un retrait de suivi ou d’une restriction ? [Clarté, FR-007–FR-013, FR-019, FR-024–FR-026, FR-031, A13–A14, A17]

## Lecture, boîte et badges

- [ ] CHK010 Les acteurs et permissions limitent-ils toutes les actions et compteurs à leur propriétaire, sans privilège Pro ou de modération ? [Complétude, FR-001, FR-037, A18]
- [ ] CHK011 La suppression fonctionnelle de l’état « ouverte » est-elle explicite, avec lecture au toucher et absence de lecture au seul affichage ? [Clarté, FR-017–FR-018, A19]
- [ ] CHK012 La lecture acceptée et l’ouverture échouée sont-elles distinctes, y compris après réponse perdue ? [Cohérence, FR-018, FR-021, FR-038, A20]
- [ ] CHK013 Do reads, purge, correction and old pushes preserve newer decisions without resurrection, repeated effects or a fabricated read update for a missing entry? [Coverage, FR-017–FR-019, FR-030, FR-034, A21]
- [ ] CHK014 L’ordre initial, les égalités, les pages, les états vides et les erreurs partielles sont-ils définis sans faux résultat vide ? [Complétude, FR-020–FR-021, A22–A23]
- [ ] CHK015 Les deux badges ont-ils une définition commune fondée sur toutes les non-lues consultables, avec disparition à zéro ? [Mesurabilité, FR-022, A24]
- [ ] CHK016 La synchronisation entre appareils et les réponses anciennes sont-elles traitées sans promesse instantanée hors ligne ou système ? [Couverture, FR-023, FR-038, A25]

## Livraison, reprise et identité

- [ ] CHK017 L’entrée personnelle est-elle indépendante de permission système, destination et succès du push, y compris pendant la maintenance F12 ? [Cohérence, FR-024, A26]
- [ ] CHK018 Les quinze minutes ont-elles une origine et une borne explicites que tentative, correction, réassociation ou maintenance ne prolongent pas, sans rattrapage des avis expirés ? [Mesurabilité, FR-025, A27]
- [ ] CHK019 Les contrôles avant envoi couvrent-ils suivi, compte, entrée, destination, restrictions et live obsolète, ainsi que la maintenance sans exception opérateur et la réévaluation après sa levée ? [Complétude, FR-026, A26–A28]
- [ ] CHK020 Acceptation du fournisseur, échec, incertitude et réception prouvée restent-ils distingués sans garantie technique implicite ? [Clarté, FR-027–FR-028, A29]
- [ ] CHK021 Les réussites partielles et invalidations ciblées empêchent-elles le renvoi volontaire aux installations déjà servies ? [Couverture, FR-028, A30]
- [ ] CHK022 L’identité d’installation et la rotation de destination excluent-elles la fusion de téléphones partageant la même version système ? [Clarté, FR-029, A31]
- [ ] CHK023 Déconnexion locale, changement de compte, suppression et réinscription préservent-ils l’isolation sans invalider arbitrairement les autres appareils ? [Cohérence, FR-030, FR-037–FR-038, A32–A33]

## Restrictions, contenu et frontières

- [ ] CHK024 Le masquage sportif couvre-t-il boîte, badge, cache et ancien accès sans assimiler clôture de saison et retrait ? [Cohérence, FR-031, FR-034, A08, A34]
- [ ] CHK025 Le lien retiré ou masqué cesse-t-il d’être annoncé disponible tout en préservant un résultat encore autorisé ? [Clarté, FR-032, A35]
- [ ] CHK026 Does sporting reappearance distinguish retained, purged/expired and independently moderated entries without resetting age or allowances? [Coverage, FR-019, FR-033, FR-043, A36, A45]
- [ ] CHK027 L’ouverture vers la fiche et les limites de rappel des messages système sont-elles explicitement compatibles avec les restrictions connues ? [Cohérence, FR-034–FR-036, A37]
- [ ] CHK028 Les quatre familles ont-elles au moins trois exemples fidèles, avec variantes pour données manquantes et résultats particuliers ? [Complétude, FR-015, A38, Bibliothèque éditoriale]
- [ ] CHK029 La stabilité éditoriale couvre-t-elle appareils, reprises et corrections sans faux faits ou nouvelle annonce ? [Cohérence, FR-016, A39]
- [ ] CHK030 Le vocabulaire de live et rediffusion évite-t-il une promesse de vidéo vérifiée, tout en préservant le libellé F03 ? [Clarté, FR-015, A40]
- [ ] CHK031 Paris, New York et les changements d’heure conservent-ils les mêmes instants et durées sans horaire supposé ? [Couverture, FR-042, A41]
- [ ] CHK032 Les résultats professionnels et les preuves exploratoires LNV TV restent-ils distincts de la collecte de médias différée ? [Délimitation, FR-039, A42]
- [ ] CHK033 Les exclusions et besoins R02 sont-ils explicites sans campagnes, nouvelles préférences ou alertes privées de modération ? [Délimitation, FR-040–FR-041, A43]
- [ ] CHK034 Are scoped notification retention, account erasure, backup protection, diagnostics and other domain lifetimes distinguished without inventing a global retention period? [Consistency, FR-036–FR-037, FR-043–FR-046, Cross-perimeter dependencies]
- [ ] CHK035 Are scenarios, measurable outcomes, V1 evidence and the approved removal of manual deletion traceable without claiming runtime or visual validation? [Traceability, SC-001–SC-008, Evidence and coverage]

## Retention, recovery and privacy

- [ ] CHK036 Are daily purge, the inclusive 29-day threshold, the 30-day maximum, the elapsed-hour definition and all family/read/visibility states unambiguous? [Measurability, FR-019, FR-042, A44]
- [ ] CHK037 Are all age-reset exclusions and the distinction from the 15-minute delivery window explicit, including maintenance? [Consistency, FR-004, FR-013, FR-019, FR-024–FR-025, A45]
- [ ] CHK038 Is the removal of individual/bulk deletion, confirmations and archive/restore controls explicit without removing account erasure? [Scope, FR-001, FR-019–FR-021, FR-041, A46]
- [ ] CHK039 Is the minimum anti-duplicate fact defined by purpose, data minimization and lifetime, distinguishing creation from receipt and consumed from unused allowances? [Completeness, FR-043, A33, A47, A52]
- [ ] CHK040 Do paging, read/refresh races and stale responses preserve exact synchronized all-page counts, surviving order and absence of expired entries? [Coverage, FR-020–FR-023, FR-038, A24–A25, A48]
- [ ] CHK041 Are offline opening/resume cleanup, active-app expiry, stopped-device limits and system-message limits explicit without claiming remote freshness? [Clarity, FR-023, FR-035–FR-036, FR-044, A49]
- [ ] CHK042 Does failed purge distinguish physical removal from maximum-age exclusion, preserve partial success and require safe observable retry without manual user cleanup? [Recovery, FR-046, A50]
- [ ] CHK043 Are backup lifetime, no alternate archive, due-entry cleanup before restore, announcement preservation and blocked access/sends on uncertainty fully specified? [Recovery, FR-045, A51]
- [ ] CHK044 Do identity/privacy, follows, sporting history, contribution allowances, maintenance and design agreements remain consistent with F07 without adding implementation choices? [Consistency, FR-037, FR-041, FR-043–FR-046, Cross-perimeter dependencies]

## Notes

- Les marqueurs appartiennent au relecteur ; ils ne sont pas cochés par la génération ou une implémentation.
- La [checklist de qualité intégrée](requirements.md) suit le cycle Specify/Clarify et ne remplace pas cette relecture.
- R01, R02 et l’acceptation sous #247 restent nécessaires avant toute planification technique.
