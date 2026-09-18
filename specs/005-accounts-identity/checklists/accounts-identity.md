# Checklist de revue : comptes, identité et suppression

**Objectif** : Examiner la précision et la cohérence des exigences F05, notamment les conflits d’identité, l’isolement des sessions et les effacements partiels

**Créée le** : 2026-09-18

**Fonctionnalité** : [Spécification F05](../spec.md)

**Note** : Checklist personnalisée issue du modèle officiel `speckit-checklist`, destinée à une revue approfondie des exigences avant acceptation fonctionnelle.

**Responsabilité de la revue** : Le relecteur détermine si chaque critère rédactionnel est satisfait et peut alors le marquer `[x]`.

**Sens des marqueurs** : `[x]` signifie que la qualité de l’exigence a été examinée et jugée satisfaisante, pas que le comportement est implémenté.

## Complétude et limites

- [ ] CHK001 L’accès invité, les actions réservées et l’onboarding facultatif sont-ils définis sans ajouter de mutation automatique après connexion ? [Complétude, Spécification §FR-001–FR-002, §A01–A02]
- [ ] CHK002 Les fournisseurs retenus, la création automatique et l’absence de formulaire obligatoire sont-ils explicites ? [Clarté, Spécification §FR-003, §FR-008, §FR-012]
- [ ] CHK003 La distinction entre migration, réinstallation et suppression volontaire est-elle suffisante pour déterminer le compte, l’ancienneté et les données retrouvées ? [Cohérence, Spécification §FR-010, §FR-024, §FR-035]

## Identité et profil

- [ ] CHK004 La préservation des associations existantes, y compris d’adresses différentes, est-elle compatible avec l’interdiction de toute nouvelle association ? [Cohérence, Spécification §FR-005–FR-007, §A04–A06]
- [ ] CHK005 Les règles de comparaison d’adresses et la préservation de leur attribution pendant le reset empêchent-elles une interprétation fondée sur le premier profil recréé ? [Clarté, Spécification §FR-007, §FR-010]
- [ ] CHK006 L’absence d’adresse à la première création est-elle distinguée d’un champ temporairement absent ou conflictuel pour un compte reconnu ? [Couverture, Spécification §FR-008–FR-009, §A07–A08]
- [ ] CHK007 La preuve de propriété, les permissions et l’assistance sont-elles définies sans autoriser de fusion sur simple e-mail ou identifiant déclaré ? [Sécurité, Spécification §FR-004, §FR-006, §FR-016, §FR-037]
- [ ] CHK008 La minimisation du profil est-elle explicite sans supprimer par erreur les coordonnées sportives ou les profils fournisseurs ? [Complétude, Spécification §FR-011, §Hypothèses et dépendances]
- [ ] CHK009 Les pseudos générés et édités partagent-ils les mêmes critères de format, d’unicité et de résultat sous concurrence ? [Mesurabilité, Spécification §FR-012–FR-013, §A10]
- [ ] CHK010 Les modifications absentes, refusées ou incertaines sont-elles distinguées d’une suppression explicite de photo ? [Couverture, Spécification §FR-014–FR-015, §A11–A12]

## Session et droits

- [ ] CHK011 L’authentification fournisseur, le profil prêt et les droits établis sont-ils décrits comme des résultats distincts ? [Clarté, Spécification §FR-017–FR-019, §FR-023]
- [ ] CHK012 Les pannes transitoires, expirations non renouvelables et révocations ont-elles des conséquences différenciées et une issue de reprise ? [Couverture, Spécification §FR-019, §A13–A15]
- [ ] CHK013 La déconnexion locale, les autres appareils et la portée de la suppression sont-ils distingués ? [Cohérence, Spécification §FR-020, §FR-022, §FR-027]
- [ ] CHK014 Les réponses tardives, droits et mutations en cours ont-ils une attribution non ambiguë lors d’un passage de A à B ou en invité ? [Couverture, Spécification §FR-021–FR-023, §A17–A19]
- [ ] CHK015 L’accord F07 couvre-t-il la désassociation des destinations, les échecs et la limite des messages déjà livrés sans promettre une réussite fictive ? [Dépendance, Spécification §FR-022, §A18]
- [ ] CHK016 La règle des droits inconnus est-elle cohérente avec F11 et laisse-t-elle la validité des preuves à F09 ? [Cohérence, Spécification §FR-023, F11 §FR-007–FR-009]

## Ancienneté

- [ ] CHK017 Le principal de référence, les associations existantes et la date métier sont-ils distingués sans utiliser l’ancienneté comme âge civil ? [Clarté, Spécification §FR-024, §A20]
- [ ] CHK018 La preuve connue pendant une panne et l’absence totale de preuve ont-elles des résultats distincts sans inventer de date ni supprimer les autres accès autorisés ? [Couverture, Spécification §FR-025, §A21–A22]

## Suppression et récupération

- [ ] CHK019 La confirmation, la propriété du compte et l’information sur la facturation précèdent-elles l’acceptation sans déconnexion prématurée ? [Cohérence, Spécification §FR-026–FR-027, §A23]
- [ ] CHK020 La frontière entre échec certain avant acceptation, réponse perdue et panne après acceptation est-elle assez précise pour définir chaque résultat ? [Clarté, Spécification §FR-027–FR-028, §A24–A25]
- [ ] CHK021 Le périmètre d’effacement comprend-il fichiers, fournisseurs, accès, données dérivées et éventuelles conservations justifiées, avec un responsable pour chaque catégorie ? [Complétude, Spécification §FR-029, §Matrice d’effacement et de conservation]
- [ ] CHK022 La conservation des contributions sans rattachement est-elle distinguée d’une anonymisation complète et d’une restauration de propriété ou de visibilité ? [Cohérence, Spécification §FR-030, §FR-035, §A27]
- [ ] CHK023 Les reprises, demandes répétées et blocages persistants ont-ils des résultats vérifiables sans prétendre annuler une suppression externe par une transaction locale ? [Couverture, Spécification §FR-028, §FR-031, §A25–A26]
- [ ] CHK024 Le résultat communiqué distingue-t-il acceptation, opérations en attente et résolution, sans exiger de preuve indisponible ou promettre une astreinte ? [Clarté, Spécification §FR-032, §A28]
- [ ] CHK025 Les conditions de recréation et la protection du nouveau compte contre les anciennes opérations sont-elles explicites, même si une référence fournisseur est réutilisée ? [Couverture, Spécification §FR-031–FR-035, §A28–A29]
- [ ] CHK026 La restauration après suppression du dossier RevenueCat reste-t-elle distincte d’une restauration ordinaire, avec qualification par store et sans retour d’avantages manuels ? [Cohérence, Spécification §FR-029, §FR-035–FR-036, §A30–A31]
- [ ] CHK027 Le chemin externe de suppression et sa vérification de propriété sont-ils définis sans imposer réinstallation, connexion préalable ou nouveau portail ? [Complétude, Spécification §FR-037, §A32]

## Qualité, confidentialité et traçabilité

- [ ] CHK028 Les preuves et données personnelles, dossiers d’assistance et restrictions après sauvegarde suivent-ils les mêmes obligations que F11/F13 ? [Cohérence, Spécification §FR-034, §FR-038–FR-039]
- [ ] CHK029 Les objectifs communs, l’accessibilité et les états dégradés ont-ils une autorité explicite sans inventer un délai uniforme pour les effacements externes ? [Dépendance, Spécification §FR-039, §Hypothèses et dépendances]
- [ ] CHK030 Les critères SC-001–SC-008 sont-ils mesurables et reliés aux exigences et scénarios, sans confondre validation documentaire et essais produits ? [Mesurabilité, Spécification §Critères de réussite, §Couverture et dépendances entre périmètres]
- [ ] CHK031 Les constats V1, recommandations fournisseurs et règles cibles sont-ils distingués, avec des renvois cohérents dans le cadrage et la cartographie ? [Traçabilité, Spécification §Éléments probants et limites V1]
- [ ] CHK032 Les responsabilités F06–F14 et la passe globale R01/R02 sont-elles explicites sans déléguer une décision F05 à l’implémentation ? [Complétude, Spécification §Couverture et dépendances entre périmètres]

## Notes

- Chaque item examine la qualité des exigences, pas l’exécution du comportement.
- Les marqueurs appartiennent au relecteur ; `speckit-implement` peut les lire mais ne les modifie pas. La checklist `requirements.md` a un cycle distinct maintenu par Specify/Clarify.
- Les détails de mécanisme, contrats et qualification fournisseur restent à dériver après acceptation fonctionnelle et passage Figma global ; les résultats attendus sont définis ici.
