# Checklist de revue : publicité, confidentialité et documents légaux

**Objectif** : Examiner la précision, la couverture et la cohérence des exigences F11 et de leurs accords avec les autres périmètres

**Créée le** : 2026-09-18

**Fonctionnalité** : [Spécification F11](../spec.md)

**Note** : Checklist personnalisée générée avec la compétence officielle `speckit-checklist` ; revue approfondie des exigences avant acceptation fonctionnelle.

**Responsabilité de la revue** : Le relecteur détermine si chaque critère rédactionnel est satisfait et peut alors le marquer `[x]`.

**Sens des marqueurs** : `[x]` signifie que la qualité de l’exigence a été examinée et jugée satisfaisante, pas que le comportement est implémenté.

## Fréquence, transitions et récupération

- [ ] CHK001 Les actions éligibles, répétitions d’une action en attente et parcours exclus sont-ils définis sans transformer chaque interaction en opportunité ? [Clarté, Spécification §FR-001–FR-002, §A01, §A04]
- [ ] CHK002 Le compteur commun aux navigations et directs, son seuil dix et sa portée locale à la session sont-ils explicites ? [Complétude, Spécification §FR-002–FR-003, §FR-006]
- [ ] CHK003 La distinction entre chargement, présentation demandée et affichage effectif suffit-elle à décider quand remettre le compteur à zéro ? [Clarté, Spécification §FR-003, §A02]
- [ ] CHK004 Les tentatives suivantes après échec sont-elles définies sans accumulation d’une dette d’annonces ni réinitialisation par changement de disponibilité ? [Cohérence, Spécification §FR-003, §FR-006, §Cas limites]
- [ ] CHK005 Les annonces absentes, non prêtes, interdites ou sans confirmation ont-elles une issue de reprise sans blocage indéfini et sans délai V1 implicitement imposé ? [Couverture, Spécification §FR-004, §A02–A03]
- [ ] CHK006 Les exigences distinguent-elles action unique, sollicitations concurrentes, fermeture, retour à l’application et affichage tardif ? [Couverture, Spécification §FR-005, §A03–A04]

## Pro, audience et choix

- [ ] CHK007 Les états payé ou offert, invité ou gratuit et inconnu gouvernent-ils uniquement la publicité Blockout, sans restreindre l’accès sportif, en excluant les publicités des services vidéo externes et en maintenant l’absence de publicité après la transition de statut à 72 heures jusqu’à une preuve fiable du statut gratuit ? [Complétude, FR-007–FR-008, A05–A07, F09 A07]
- [ ] CHK008 L’absence de délai transformant un statut inconnu en gratuit et l’attribution de la validité des preuves à F09 sont-elles explicites ? [Cohérence, Spécification §FR-007, §Dépendances entre périmètres]
- [ ] CHK009 La préparation parallèle, la réutilisation des choix et l’évitement de sollicitations inutiles pour un Pro connu sont-ils compatibles avec le contrôle avant présentation ? [Cohérence, Spécification §FR-008–FR-009, §A08]
- [ ] CHK010 Le public 13+, l’absence de collecte d’âge et de personnalisation pour tous sont-ils distingués de l’ancienneté du compte et des réglages de production encore à qualifier ? [Clarté, Spécification §FR-010–FR-011, §A09, §A27]
- [ ] CHK011 Les opportunités identiques, les modes autorisés et la disponibilité réelle sont-ils distingués sans assimiler refus à Pro ni promettre un nombre d’impressions identique ? [Clarté, Spécification §FR-012–FR-013, §A10]
- [ ] CHK012 Les autorisations système, le consentement, la personnalisation et les conditions ATT sont-ils séparés sans supposer que toute publicité non personnalisée est exempte d’autorisation ? [Cohérence, Spécification §FR-011–FR-013, §Références externes et limites]
- [ ] CHK013 La consultation/modification des choix inclut-elle erreurs, reprise, décisions antérieures applicables et annonces préparées incompatibles ? [Couverture, Spécification §FR-014, §A11]

## Documents et permissions

- [ ] CHK014 Les trois documents, l’accès invité avant l’action concernée, les états absents/en erreur et la reprise sont-ils définis ? [Complétude, Spécification §FR-015–FR-016, §A12]
- [ ] CHK015 La préservation de l’éditeur mobile et des capacités hors interface est-elle explicite, sans sélection de contrat ni confusion entre bouton visible et permission d’enregistrement ? [Périmètre, Spécification §FR-017, §A13–A14, §E03]
- [ ] CHK016 La validation du résultat publié couvre-t-elle champs vides, espaces, modification partielle, refus et résultat incertain sans perte de l’état antérieur ? [Couverture, Spécification §FR-018, §A14]
- [ ] CHK017 Le titre restitué, la version libre, la date réelle et l’absence d’obligation de changer de version sont-ils cohérents ? [Clarté, Spécification §FR-019, §A13]
- [ ] CHK018 L’absence d’historique et de registre d’acceptation est-elle distinguée des consentements spécifiques et de l’information de confidentialité ? [Cohérence, Spécification §FR-020, §A15]

## Données personnelles, conservation et droits

- [ ] CHK019 La matrice distingue-t-elle finalités, destinataires et propriétaires sans exiger tous les champs V1 ni autoriser leur réutilisation publicitaire ? [Complétude, Spécification §FR-021, §Catégories, finalités et responsabilités]
- [ ] CHK020 Contacts utiles, arbitres rattachés aux matchs et restrictions prioritaires sont-ils décrits sans annuaire personnel ni archive des anciennes coordonnées, sans contournement par correction administrative ou retour à la source F02 ? [Périmètre, Spécification §FR-022–FR-024, §A16–A17 ; F02 §A36]
- [ ] CHK021 Les corrections et restrictions priment-elles sur collecte, réactivation et reconstruction sans supprimer indistinctement l’identité ou l’histoire sportives ? [Cohérence, Spécification §FR-023–FR-024, §A17]
- [ ] CHK022 La restauration exige-t-elle l’application des restrictions courantes ou la suspension des accès concernés, avec sauvegardes distinctes d’une consultation alternative ? [Couverture, Spécification §FR-025, §A18]
- [ ] CHK023 Les 30 jours de sauvegarde, données actives, tickets et journaux sont-ils distingués sans délai de conservation inventé ? [Clarté, Spécification §FR-026–FR-027, §FR-034]
- [ ] CHK024 L’absence de purge périodique des issues reste-t-elle compatible avec les demandes individuelles et les copies séparées, sans certification de conservation illimitée ? [Cohérence, Spécification §FR-034, §A24]
- [ ] CHK025 Le contact accessible sans compte, le traitement manuel, la vérification proportionnée et les résultats partiels d’une demande sont-ils explicités ? [Complétude, Spécification §FR-035–FR-036, §A25–A26]
- [ ] CHK026 Les délais légaux et l’information sur les traitements effectifs sont-ils distingués d’un engagement d’astreinte, d’un texte initial et d’une conformité déjà certifiée ? [Clarté, Spécification §FR-036–FR-037, §A26–A27]

## Accord d’assistance et responsabilités

- [ ] CHK027 L’accès avant connexion/après échec, l’e-mail obligatoire prérempli mais modifiable et sa finalité de réponse sont-ils entièrement définis ? [Complétude, Spécification §FR-028, §A20]
- [ ] CHK028 Format, délivrabilité, possession et preuve d’identité sont-ils distingués sans créer un nouveau parcours de vérification ni une récupération de compte par e-mail déclaré ? [Clarté, Spécification §FR-029, §A20, §A22]
- [ ] CHK029 Le contexte fiable inclut-il la cible malgré l’échec de chargement et l’étape de connexion, sans nom inventé, jeton ni contenu fournisseur brut ? [Couverture, Spécification §FR-030, §A21]
- [ ] CHK030 Les destinataires des tickets, captures, fichiers et notifications secondaires sont-ils délimités, y compris en cas d’échec partiel ? [Complétude, Spécification §FR-027, §FR-031, §A19, §A22–A23]
- [ ] CHK031 L’outil GitHub, les réponses par e-mail et l’absence de dialogue intégré sont-ils des choix distincts des mécanismes techniques non sélectionnés ? [Périmètre, Spécification §FR-032–FR-033, §A22–A23]
- [ ] CHK032 L’acceptation du contenu avec toutes les images, les états intermédiaires ou incertains et l’alerte secondaire indépendante sont-ils distingués sans livraison partielle, édition après confirmation ou doublon volontaire ? [Couverture, Spécification §FR-033, §A23]
- [ ] CHK033 Chaque exigence possède-t-elle un scénario et un résultat mesurable, avec observations V1 et exigences futures distinguées ? [Traçabilité, Spécification §Couverture de l’inventaire et des décisions, §SC-001–SC-008]
- [ ] CHK034 Les accords avec F01/F02/F05/F09/F10/F13 et les besoins de la revue Figma globale sont-ils explicites sans prétendre terminer les autres périmètres ? [Dépendances, Spécification §Dépendances entre périmètres, §Hypothèses]

## Notes

- Examiner la rédaction des exigences ; cette checklist ne constitue pas un résultat de test de l’application.
- Les éléments générés restent non cochés. `speckit-implement` lit les marqueurs sans les modifier.
- La [checklist des exigences](requirements.md) possède le cycle de vie distinct de Specify/Clarify.
