<a id="sporting-data-checklist-identity-and-lifecycle"></a>

# Checklist des données sportives : identité et cycle de vie

**Objectif** : Examiner la clarté, la couverture et la complexité proportionnée des exigences avant d’accepter la spécification des données sportives

**Créée le** : 2026-09-16

**Fonctionnalité** : [Spécification des données sportives](../spec.md)

**Responsabilité de la revue** : Cette checklist Spec Kit personnalisée est un document de qualité des exigences relevant du relecteur. Un élément ne doit être marqué `[x]` qu’après évaluation par le relecteur.

**Sens des marqueurs** : Un élément coché concerne la qualité des exigences, pas un logiciel livré ou un test de production réussi.

<a id="identity-and-classification-completeness"></a>

## Complétude des identités et classifications

- [ ] CHK001 L’identité Blockout, le contexte source, les noms d’origine et les personnalisations d’affichage sont-ils explicitement distingués ? [Clarté, Spécification §FR-001–FR-007]
- [ ] CHK002 Les équipes d’un même club, les poules multiples dans une même division, les divisions différentes et les saisons distinctes sont-elles différenciées sans choisir de clés de base de données ? [Couverture, Spécification §FR-002–FR-005, §A01–A02]
- [ ] CHK003 La normalisation autorisée des noms et la maintenance des alias délimités sont-elles bornées sans rapprochement approximatif ni nouvelle interface de gestion ? [Clarté, Spécification §FR-006–FR-008]
- [ ] CHK004 La publication sans attendre la fiche d’un club identifié sans ambiguïté est-elle garantie lorsque les autres conditions sont remplies, avec détails inconnus explicites et isolation locale des rattachements ambigus, sans créer de ressources fictives pour les places futures ni d’équipes à partir du seul classement ? [Complétude, Spécification §FR-009, §FR-053, §A05]
- [ ] CHK005 Les dérogations complètes, l’héritage du pack et les exclusions prioritaires sont-ils cohérents avec la conservation de la classification et de la visibilité publiées après suppression, l’arrêt de collecte et les contrôles de restauration ? [Cohérence, Spécification §FR-004, §FR-011–FR-014, §FR-041, §A06–A08 ; F01 §FR-008–FR-010]
- [ ] CHK006 Les corrections sans conflit sont-elles distinguées des cas d’équipe partagée ou de collision cible, avec refus intégral de la demande et absence de reprise de collecte après restauration refusée ? [Couverture, Spécification §FR-012–FR-014, §A07–A08]
- [ ] CHK007 Les modifications de présentation conservent-elles l’état actif ou inactif, les doublons de nom sans distinction de casse sont-ils refusés à la création comme au renommage, et la réactivation explicite est-elle distinguée des restrictions de sélection, de visibilité et de collecte qui restent applicables ? [Complétude, Spécification §FR-015–FR-016, §A09–A10]

<a id="proportionate-reliability-and-consistency"></a>

## Fiabilité proportionnée et cohérence

- [ ] CHK008 Les dernières références connues de la même saison sont-elles autorisées pendant un échec de découverte sans permettre de deviner des références, de réutiliser une référence dont l’absence est confirmée ou de recourir à une ancienne configuration ? [Cohérence, Spécification §FR-017 ; F01 §FR-005–FR-006, §FR-034]
- [ ] CHK009 Le rejet du document entier est-il limité aux problèmes globaux de contexte ou de structure, avec isolation locale des matchs et champs énoncée séparément ? [Clarté, Spécification §FR-018–FR-020]
- [ ] CHK010 Les retraits sont-ils interdits après une acquisition ou intégration partielle sans exiger une publication indivisible de toute la poule ? [Cohérence, Spécification §FR-019–FR-021, §A12–A14]
- [ ] CHK011 Le rejeu, les observations périmées, le travail en cours et les personnalisations manuelles sont-ils couverts sans imposer le stockage d’une version à chaque collecte ? [Couverture, Spécification §FR-022, §FR-027, §FR-043]
- [ ] CHK012 L’intégration partielle se distingue-t-elle d’une synchronisation complète, avec des diagnostics délimités exploitables et un responsable de reprise identifié ? [Complétude, Spécification §FR-048 ; Dépendances entre périmètres §F13]

<a id="official-sporting-content"></a>

## Contenu sportif officiel

- [ ] CHK013 Les phases présentes uniquement sur la LNV sont-elles autorisées sans emprunter l’identité d’une autre phase, et les participants indéterminés sont-ils traités de façon cohérente ? [Couverture, Spécification §FR-009, §FR-023]
- [ ] CHK014 La priorité fixe des sources est-elle distinguée de l’ordre de récupération, de l’information inconnue et du retrait explicite, avec une autorité de calendrier définie avant l’établissement d’une source supérieure et conservée après son échec, sans effet des observations ou échecs indépendants secondaires sur le compteur de confirmation du vide ? [Clarté, Spécification §FR-024–FR-027, §A27–A30]
- [ ] CHK015 Les résultats publiés considérés comme fiables, les scores explicitement provisoires et le sens réellement ambigu d’une publication sont-ils distingués sans arbitrage universel des règles sportives ? [Clarté, Spécification §FR-028]
- [ ] CHK016 Un détail de sets invalide laisse-t-il utilisable un score global officiel exploitable, sans mélanger des observations de résultat contradictoires ? [Cohérence, Spécification §FR-024, §FR-029]
- [ ] CHK017 Les notations particulières et le retrait ou la correction de résultat sont-ils spécifiés sans scores inventés ni politique implicite de notification ? [Couverture, Spécification §FR-030–FR-031 ; Dépendances entre périmètres §F07]
- [ ] CHK018 Les dates inconnues, l’ambiguïté de minuit, les fuseaux sources et l’appartenance à la saison sont-ils distingués du regroupement par jour en consultation ? [Clarté, Spécification §FR-032–FR-033, §A23]
- [ ] CHK019 L’ordre et les statistiques officiels sont-ils conservés sans recalcul, mélange de tableaux ou remplacement numérique des valeurs inconnues ou particulières ? [Cohérence, Spécification §FR-034–FR-036]
- [ ] CHK020 Les lignes valides du classement peuvent-elles rester visibles sans lien vers une équipe ou participation actuelle, sans créer ou réactiver de ressources sportives ? [Clarté, Spécification §FR-035, §FR-039, §FR-044]

<a id="visibility-and-recovery"></a>

## Visibilité et rétablissement

- [ ] CHK021 Le retrait confirmé utilise-t-il le catalogue faisant autorité pour la saison propre à la ressource, y compris la distinction LNV/FFVB ? [Clarté, Spécification §FR-037]
- [ ] CHK022 Le masquage intégral des matchs retirés, avec ou sans résultat, exige-t-il un calendrier complet faisant autorité et, pour un vide valide, deux confirmations planifiées qualifiées de la même autorité, avec conservation sur vide historique exceptionnel répété d’une saison clôturée, sans effet sur les autres participations d’une équipe ni confusion avec une panne, un retrait au catalogue ou une annulation sportive ? [Cohérence, Spécification §FR-019, §FR-024, §FR-037–FR-040, §FR-043, §A27–A28, §A31]
- [ ] CHK023 Pause, exclusion, inactivité de division, absence à la source et clôture saisonnière sont-elles distinctes, avec cumul des motifs de visibilité ? [Complétude, Spécification §FR-016, §FR-041–FR-043]
- [ ] CHK024 La redécouverte au catalogue et la réapparition dans le calendrier faisant autorité sont-elles distinctes, sans réactivation par une source secondaire, remplacement d’identité ou levée de motifs de visibilité sans rapport ? [Couverture, Spécification §FR-024, §FR-042–FR-044, §A30]
- [ ] CHK025 La conservation sur vide exceptionnel répété et les corrections ou retraits individuels sur calendrier historique complet non vide sont-ils explicites, et la conservation normale de l’historique V2 est-elle distinguée de la visibilité et de l’exception de remise à zéro V1, avec préservation des associations et fichiers des logos de clubs, rattachement certain et conservation des cas non résolus ? [Cohérence, Spécification §FR-019, §FR-043, §FR-046, §A31, §A39 ; Dépendances entre périmètres §F14]

<a id="presentation-coordinates-and-delivery-boundaries"></a>

## Présentation, coordonnées et limites de livraison

- [ ] CHK026 Les réinitialisations indépendantes des noms complets et courts, l’héritage du logo actuel du club et les résultats des remplacements de logo échoués ou invalides sont-ils définis au fil des mises à jour sources et des anciennes saisons ? [Clarté, Spécification §FR-045–FR-046]
- [ ] CHK027 Les permissions administratives et les résultats de refus sont-ils définis sans attribuer tous les privilèges aux modérateurs ni inventer un éditeur de matchs ? [Complétude, Spécification §FR-047–FR-048]
- [ ] CHK028 L’échec de fiche, la localisation communale, les changements de rue seuls, les réponses de géocodage périmées et les nouvelles tentatives non résolues sont-ils distingués ? [Couverture, Spécification §FR-049–FR-053, §A05, §A36–A38]
- [ ] CHK029 Les scénarios d’acceptation individuels couvrent-ils toutes les exigences et tous les résultats mesurables sans prétendre que des sources échantillonnées prouvent une couverture logicielle complète ? [Traçabilité, Spécification §Scénarios utilisateurs et validation, §Critères de réussite, §Éléments probants et traçabilité des décisions]
- [ ] CHK030 L’alignement F01, les états pour les consommateurs, la responsabilité de confidentialité et de qualité, la sémantique partagée et les jalons globaux Figma et corpus sont-ils explicites sans architecture ni tâches techniques ? [Périmètre, Spécification §Hypothèses, §Dépendances entre périmètres]

## Notes

- Examiner les exigences écrites, pas la réussite des tests d’acceptation d’une implémentation future.
- Rattacher les constats à l’exigence ou au scénario pertinent ; cette checklist n’ajoute aucun comportement produit.
- La [checklist des exigences](requirements.md) intégrée suit un cycle de vie Specify/Clarify distinct.
