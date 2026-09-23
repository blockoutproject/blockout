# Checklist de qualité et d’exploitation : exigences communes F13

**Objectif** : Examiner la clarté, la mesurabilité et la cohérence des exigences de qualité, de protection et de reprise avant l’acceptation fonctionnelle.

**Créée le** : 2026-09-17

**Fonctionnalité** : [Spécification de qualité commune et d’exploitation](../spec.md)

**Note** : Cette checklist personnalisée est générée par la compétence officielle `speckit-checklist` pour le périmètre approuvé.

**Responsabilité de la revue** : Le relecteur détermine si chaque critère de qualité des exigences est satisfait et peut alors le marquer `[x]`.

**Sens des marqueurs** : `[x]` signifie que la rédaction des exigences a été examinée et jugée satisfaisante, pas que l’implémentation est terminée.

## Complétude et mesurabilité

- [ ] CHK001 Les utilisateurs réguliers, ouvertures sur un week-end, utilisateurs simultanés et actions par seconde sont-ils distingués, sans transformer les déclarations V1 en mesures ? [Clarté, Spécification §FR-001, §Hypothèses]
- [ ] CHK002 Les conditions de charge précisent-elles durée, parcours, diversité des données, plateformes, réseau, caches et travaux automatiques pour rendre les résultats reproductibles ? [Mesurabilité, Spécification §FR-001–FR-002, §A01]
- [ ] CHK003 Le seuil de deux secondes définit-il début, contenu utile, proportion par famille, traitement des erreurs et attentes, et exclusions de connexion/paiement/documents ? [Clarté, Spécification §FR-003, §SC-001]
- [ ] CHK004 Le délai d’une minute commence-t-il à l’acceptation sportive et couvre-t-il les vues dérivées sans imposer un rafraîchissement continu ? [Clarté, Spécification §FR-004–FR-005, §A02]
- [ ] CHK005 L’objectif de disponibilité définit-il parcours, période, maintenance, pannes externes, absence de mesure et absence de double comptage ? [Mesurabilité, Spécification §FR-006–FR-007, §A04]

## Cohérence et exploitation

- [ ] CHK006 Les objectifs de qualité restent-ils compatibles avec l’intervention manuelle sans délai humain garanti et sans astreinte ? [Cohérence, Spécification §FR-007, §FR-011, §A05]
- [ ] CHK007 Les distinctions entre observation fournisseur, acquisition, intégration et propagation préservent-elles les cadences et seuils F01 ? [Cohérence, Spécification §FR-005, §FR-012]
- [ ] CHK008 La détection et l’alerte d’une perte de VPS sont-elles définies sans dépendance exclusive au VPS ni choix de fournisseur ? [Complétude, Spécification §FR-009–FR-010, §A05]
- [ ] CHK009 Les incidents délimités, réussites partielles, pauses et rétablissements sont-ils distingués avec regroupement et absence de notifications répétées ? [Couverture, Spécification §FR-010–FR-012, §A06–A07]
- [ ] CHK010 Les informations de diagnostic et les erreurs utilisateur sont-elles délimitées, sans secret, donnée personnelle ni conservation de journaux déduite des sauvegardes ? [Cohérence, Spécification §FR-013]
- [ ] CHK011 Les consignes de reprise définissent-elles préconditions, permissions, limites et critères de résultat sans assimiler une commande acceptée à un rétablissement ? [Complétude, Spécification §FR-014, §A07, §A18]

## Sécurité et traitements partiels

- [ ] CHK012 Les droits sont-ils exigés pour l’action et la ressource indépendamment de l’interface, avec refus sans effet et tolérances Pro attribuées à F09 ? [Complétude, Spécification §FR-015, §FR-017–FR-018, §A08]
- [ ] CHK013 Les changements de compte, réponses différées et reprises après reconnexion disposent-ils de règles empêchant les fuites entre sessions ? [Couverture, Spécification §FR-016, §A09]
- [ ] CHK014 Le résultat incertain d’une action est-il distingué d’un échec confirmé, avec reprise sans effet métier dupliqué ? [Clarté, Spécification §FR-008, §FR-019, §A10]
- [ ] CHK015 La reconstruction conserve-t-elle les résultats utilisables, interdit-elle une complétude fictive et applique-t-elle les restrictions courantes ? [Cohérence, Spécification §FR-020, §A12]
- [ ] CHK016 Les reprises partielles et observations anciennes préservent-elles réussites, identités, autorité sportive et absence de notifications métier dupliquées ? [Couverture, Spécification §FR-019–FR-021, §A11–A13]

## Protection et restauration

- [ ] CHK017 Les bornes de perte de 30 minutes et quatre heures sont-elles définies par catégorie de données effectivement récupérables, sans dépendre de la répartition des bases ? [Mesurabilité, Spécification §FR-022, §A14]
- [ ] CHK018 L’indépendance des copies, leur rétention de 30 jours et la préservation de la dernière copie exploitable sont-elles explicites ? [Complétude, Spécification §FR-023, §A15–A16]
- [ ] CHK019 La protection des fichiers et de leurs associations couvre-t-elle suppression/remplacement, rétention et cohérence avec l’état restauré, sans confondre URL, S3 et sauvegarde ? [Couverture, Spécification §FR-024, §A14–A16]
- [ ] CHK020 Les sauvegardes échouées, trop anciennes ou partielles ont-elles des conséquences d’exploitation distinctes d’une protection démontrée ? [Clarté, Spécification §FR-025, §A15]
- [ ] CHK021 L’exercice de restauration avant lancement précise-t-il isolation, perte du stockage d’origine, données/fichiers, écarts et durée mesurée sans délai garanti ? [Mesurabilité, Spécification §FR-026, §A16]
- [ ] CHK022 La restauration applique-t-elle les obligations courantes d’effacement et de droits avant remise à disposition, avec suspension si elles ne sont pas établies ? [Cohérence, Spécification §FR-027, §A17]
- [ ] CHK023 Le retour de version est-il distinct d’une restauration de données, avec compatibilité exigée et récupération V2 après ouverture selon F14 sans retour fonctionnel V1 obligatoire ? [Clarté, Spécification §FR-028, §A18]

## Plateformes et continuité

- [ ] CHK024 Les plateformes, contenus français, matrice de qualification et frontières des versions minimales sont-ils définis sans ajout implicite de web, tablette ou langue ? [Périmètre, Spécification §FR-029, §A19]
- [ ] CHK025 Les exigences d’accessibilité couvrent-elles lecture vocale, texte agrandi, cible tactile, focus, couleur et animations sans affirmation de certification ? [Complétude, Spécification §FR-030, §A20]
- [ ] CHK026 Les états d’erreur, attente, données conservées et résultat incertain sont-ils distingués sans inventer un mode hors ligne complet ? [Couverture, Spécification §FR-008, §FR-031, §A21]
- [ ] CHK027 La continuité des logos de clubs distingue-t-elle associations, fichiers, correspondances certaines, cas non résolus et conservation avant remise à zéro ? [Couverture, Spécification §FR-032, §A22]
- [ ] CHK028 Le périmètre de reprise reste-t-il limité aux logos de clubs, avec identité F02 et transition F14, sans export ni migration présentés comme réalisés ? [Périmètre, Spécification §FR-032, §Éléments probants et traçabilité des décisions]

## Traçabilité et limites

- [ ] CHK029 Chaque exigence possède-t-elle un scénario et un résultat mesurable, avec sources V1, déclarations et décisions approuvées clairement distinguées ? [Traçabilité, Spécification §Couverture de l’inventaire, §SC-001–SC-008]
- [ ] CHK030 Les responsabilités F05/F09/F11/F12/F14 et les revues R01/R02 sont-elles explicites sans prétendre achever ces périmètres ni autoriser une planification technique ? [Dépendances, Spécification §Dépendances entre périmètres, §Hypothèses]

## Notes

- Examiner les exigences écrites, pas la réussite d’une implémentation future.
- Les éléments générés restent non cochés. `speckit-implement` lit les marqueurs mais ne les modifie pas.
- La [checklist des exigences](requirements.md) possède le cycle de vie intégré distinct de Specify/Clarify.
