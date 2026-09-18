# Checklist de revue : abonnements et avantages Pro

**Objectif** : Examiner la précision, la cohérence et la couverture des exigences F09 avant la revue fonctionnelle globale.

**Créée le** : 2026-09-18

**Fonctionnalité** : [Spécification F09](../spec.md)

**Responsabilité** : Cette checklist appartient au relecteur. Une case cochée signifie que la qualité de l’exigence a été examinée et jugée satisfaisante, jamais que son implémentation ou sa qualification fournisseur est terminée.

## Périmètre et états

- [ ] CHK001 Les trois bénéfices sont-ils exhaustifs, sans restriction payante ajoutée implicitement aux autres consultations ? [Complétude, FR-001, A01]
- [ ] CHK002 Les droits indépendants et leur combinaison sont-ils définis sans confondre fin d’un droit et perte de tout accès Pro ? [Cohérence, FR-002, A03]
- [ ] CHK003 Gratuit confirmé, droits inconnus, tolérance et paiement en attente ont-ils chacun un résultat identifiable ? [Clarté, FR-003–FR-004, tableau des états]
- [ ] CHK004 L’absence de publicité et d’incitation au rachat en état inconnu est-elle cohérente avec F11, y compris à la fin de la tolérance ? [Cohérence, FR-004, A02, A07]
- [ ] CHK005 Le compte utilisable, les associations existantes et l’isolement des réponses tardives respectent-ils F05 sans assimiler connexion et propriété du paiement ? [Cohérence, FR-005–FR-006, FR-016, A04–A05]

## Délais, preuve et panne

- [ ] CHK006 La fenêtre normale de cinq minutes précise-t-elle son point de départ, les conditions de disponibilité et les réévaluations au premier plan ou à l’accès Pro ? [Mesurabilité, FR-007, A06]
- [ ] CHK007 La vérification immédiate après achat/restauration est-elle distincte de la simple réception d’une réponse ou lecture de cache ? [Clarté, FR-008, A08, A14, A18]
- [ ] CHK008 La borne exacte de 72 heures part-elle de la dernière confirmation fiable, sans remise à zéro par relance, reprise échouée ou changement d’heure locale ? [Mesurabilité, FR-008–FR-009, A07–A08, cas limites]
- [ ] CHK009 Les fins certaines, révocations, transferts, échéances de cadeaux et suppressions prévalent-ils explicitement sur cette tolérance ? [Couverture négative, FR-009–FR-010, A09–A10]
- [ ] CHK010 Les informations retardées et répétées ont-elles une règle de priorité empêchant la résurrection d’un droit invalidé ? [Cohérence, FR-010, A09]
- [ ] CHK011 Annulation du renouvellement, grâce store et tolérance Blockout sont-elles distinguées sans déduire la validité du seul nom d’un événement ? [Clarté, FR-011, A11]
- [ ] CHK012 Les délais store → RevenueCat, vérification Blockout et propagation F13 sont-ils séparés sans promesse implicite de notification instantanée ? [Dépendances, FR-007, FR-031–FR-032, A06, A29]

## Achat et gestion

- [ ] CHK013 Les informations commerciales reposent-elles sur l’offre réelle, sans prix, essai, niveau ou partage familial inventé ? [Exactitude, FR-012–FR-013, A12]
- [ ] CHK014 Les résultats annulé, différé, échoué, incertain et payé sont-ils suffisamment distincts pour éviter une nouvelle facturation involontaire ? [Couverture, FR-014, A13–A15]
- [ ] CHK015 Un paiement confirmé avec activation indisponible conserve-t-il une issue honnête et une reprise sans invitation à payer à nouveau ? [Couverture exceptionnelle, FR-014–FR-015, A14]
- [ ] CHK016 L’activation sans redémarrage et les entrées du profil sont-elles vérifiables sans imposer le placement visuel réservé à R02 ? [Mesurabilité, FR-015–FR-017, A15–A17]
- [ ] CHK017 La gestion de l’abonnement reste-t-elle attribuée au store d’origine, distincte du cadeau et compréhensible depuis l’autre plateforme ? [Clarté, FR-017–FR-018, A16]

## Restauration et récupération

- [ ] CHK018 La restauration reste-t-elle identifiable pour tout compte utilisable, indépendante d’un nouvel achat et déclenchée par une action informée ? [Complétude, FR-005, FR-019, A17]
- [ ] CHK019 Absence d’achat applicable, restauration active et résultat inconnu sont-ils distingués sans faux succès ? [Clarté, FR-019, A18]
- [ ] CHK020 Le transfert exclut-il fusion métier, double attribution du même droit et transfert des cadeaux, tout en préservant les autres droits ? [Cohérence, FR-020, A19]
- [ ] CHK021 Le retour sur le même compte et la récupération d’un achat de l’autre store ont-ils des chemins distincts sans promesse de restauration native impossible ? [Couverture, FR-016, FR-021, A04, A20]
- [ ] CHK022 Le cycle après suppression inclut-il le dossier RevenueCat, les deux stores et la protection du nouveau compte contre les anciens effacements ? [Complétude, FR-022, A21, F05]
- [ ] CHK023 Les preuves de récupération relient-elles demande, destinataire authentifié, transaction valide et propriété corroborée, sans accepter automatiquement e-mail, capture ou numéro isolé ? [Précision, FR-023–FR-024, A22–A23]
- [ ] CHK024 Refus, demande complétée, incompatibilité fournisseur et résultat incertain ont-ils une issue sans transfert global, cadeau automatique ou répétition aveugle ? [Couverture négative, FR-024–FR-026, A23–A24]
- [ ] CHK025 La trace privée et les contrôles avant/après sont-ils définis, avec une distinction claire entre attribution Blockout et compte store payeur ? [Auditabilité, FR-025–FR-026, A22, A24]

## Cadeaux, confidentialité et qualification

- [ ] CHK026 Début immédiat, échéance explicite ou absente, modification, prolongation et révocation sont-ils définis sans cumul implicite ni prolongation de panne d’un cadeau expiré ? [Complétude, FR-027, A25–A26]
- [ ] CHK027 L’indépendance des cadeaux couvre-t-elle prélèvements, renouvellements, remboursements, transfert d’achat et suppression/recréation ? [Cohérence, FR-028, A27–A28]
- [ ] CHK028 Les interventions sont-elles réservées au propriétaire dans RevenueCat au lancement, sans écran Blockout supplémentaire, délégation implicite ou présentation erronée du rôle Support ? [Périmètre, FR-023, FR-027, FR-029, A25]
- [ ] CHK029 Les interventions échouées ou incertaines et leur visibilité dans l’application ont-elles des critères compatibles avec la fraîcheur et F13 ? [Reprise, FR-030–FR-031, A26, A29]
- [ ] CHK030 Les exigences distinguent-elles les observations V1, la documentation fournisseur et la qualification future des réglages, identités et effets réels ? [Traçabilité, FR-032, A19, A21, éléments probants]
- [ ] CHK031 L’accessibilité, l’assistance et les contenus publics restent-ils disponibles dans les états dégradés selon F05/F13 ? [Cohérence transversale, FR-033, A02, SC-008]
- [ ] CHK032 La confidentialité des preuves/traces, la suppression et les restaurations de sauvegarde respectent-elles F11/F13 sans rétention illimitée ni restauration d’un droit révoqué ? [Cohérence, FR-034, A23, A29]

## Notes

- Les marqueurs restent non cochés jusqu’à la revue. Ils ne certifient aucun test réel de paiement, transfert, suppression ou configuration fournisseur.
- La [checklist de qualité Specify/Clarify](requirements.md) a un cycle distinct.
- Les contrats, mécanismes de preuve et d’autorisation, schémas et essais techniques seront dérivés après acceptation du corpus ; cette checklist évalue les exigences.
