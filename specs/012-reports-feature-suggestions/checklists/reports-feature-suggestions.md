# Checklist de relecture : signalements et suggestions d’amélioration

**Objectif** : Revue approfondie des exigences F10 avant acceptation fonctionnelle globale.

**Créée le** : 2026-09-22

**Fonctionnalité** : [Spécification F10](../spec.md)

**Propriété** : Les cases appartiennent au relecteur. Une case cochée signifie que la qualité de l’exigence a été examinée et satisfaite, pas que le comportement est implémenté.

## Complétude du formulaire

- [ ] CHK001 L’accès invité et les points d’entrée après échec sont-ils définis indépendamment du chargement de la ressource ? [Qualité des exigences, Spécification §FR-001, A01]
- [ ] CHK002 Les deux natures et leurs champs communs obligatoires sont-ils explicites ? [Qualité des exigences, Spécification §FR-002–FR-004, A02–A03]
- [ ] CHK003 Le sujet facultatif, sa proposition fiable et sa correction sont-ils définis sans classement obligatoire ? [Qualité des exigences, Spécification §FR-003, A02]
- [ ] CHK004 La finalité, le format et la modification de l’e-mail sont-ils distingués de sa possession ? [Qualité des exigences, Spécification §FR-005, A04]
- [ ] CHK005 La cible inaccessible et le contexte d’authentification excluent-ils les informations inventées et les secrets ? [Qualité des exigences, Spécification §FR-006–FR-008, A05–A07]

## Images et continuité de saisie

- [ ] CHK006 Les limites de nombre, formats et taille après préparation sont-elles mesurables, y compris aux bornes ? [Qualité des exigences, Spécification §FR-009–FR-010, A08–A10]
- [ ] CHK007 Le caractère facultatif, l’examen et le retrait des images sont-ils explicites ? [Qualité des exigences, Spécification §FR-009–FR-011, A08]
- [ ] CHK008 Les erreurs de préparation et permissions précisent-elles la conservation du texte et le traitement de la sélection ? [Qualité des exigences, Spécification §FR-012, A11]
- [ ] CHK009 Le parcours temporaire, l’abandon et l’absence de brouillon après redémarrage sont-ils distingués ? [Qualité des exigences, Spécification §FR-013–FR-014, A12, A19]
- [ ] CHK010 L’isolation lors d’un changement de compte couvre-t-elle la saisie et les reprises ? [Qualité des exigences, Spécification §FR-015, A13]

## Envoi entier et états incertains

- [ ] CHK011 La frontière d’acceptation exige-t-elle le contenu et toutes les images dans le même dossier autorisé ? [Qualité des exigences, Spécification §FR-016–FR-018, A14–A16]
- [ ] CHK012 La correction après échec confirmé est-elle distinguée d’une livraison partielle ou d’une édition après acceptation ? [Qualité des exigences, Spécification §FR-017–FR-019, A15, A21]
- [ ] CHK013 Les effets intermédiaires couvrent-ils le ticket créé avec rattachement échoué et les fichiers isolés ? [Qualité des exigences, Spécification §FR-021, A16]
- [ ] CHK014 La réponse perdue permet-elle d’établir le résultat sans second dossier final ? [Qualité des exigences, Spécification §FR-020–FR-021, A17]
- [ ] CHK015 Les doubles appuis, reprises concurrentes et changements de saisie ont-ils des conséquences explicites ? [Qualité des exigences, Spécification §FR-021–FR-022, A18]
- [ ] CHK016 La fermeture et le redémarrage sont-ils distingués de l’annulation d’une opération transmise ? [Qualité des exigences, Spécification §FR-023, A19]
- [ ] CHK017 La confirmation exclut-elle les ajouts et modifications ultérieurs dans l’application ? [Qualité des exigences, Spécification §FR-024, A21]
- [ ] CHK018 L’alerte secondaire reste-t-elle indépendante de la réception complète et sans nouvelle soumission imposée ? [Qualité des exigences, Spécification §FR-025, A20]
- [ ] CHK019 L’absence de réseau est-elle distinguée d’un résultat incertain et d’un envoi différé garanti ? [Qualité des exigences, Spécification §FR-030, A22]

## Cohérence et confidentialité

- [ ] CHK020 Les destinataires autorisés couvrent-ils ticket, fichiers séparés et diagnostics en cas d’échec ? [Qualité des exigences, Spécification §FR-025–FR-026, A23]
- [ ] CHK021 GitHub, réponse par e-mail et absence de suivi intégré sont-ils délimités sans SLA ni promesse de réalisation ? [Qualité des exigences, Spécification §FR-027, A24]
- [ ] CHK022 Les signalements F08 sont-ils distincts des demandes d’assistance concernant la diffusion ? [Qualité des exigences, Spécification §FR-028, A25]
- [ ] CHK023 Les pouvoirs sportifs, d’identité et Pro sont-ils distincts de l’accès au dossier ? [Qualité des exigences, Spécification §FR-008, FR-028, A07, A26]
- [ ] CHK024 La conservation et les demandes applicables restent-elles cohérentes avec F11 sans purge nouvelle ? [Qualité des exigences, Spécification §FR-029, A27]
- [ ] CHK025 L’envoi entier est-il cohérent avec F11 FR-033/A23 sans assimiler un dossier incomplet à une demande finalisée ? [Qualité des exigences, Spécification §FR-018–FR-025, Dépendances]

## Critères, preuves et conception

- [ ] CHK026 Les critères mesurent-ils absence de doublon, de réussite incomplète et de fuite sans qualifier prématurément la V2 ? [Qualité des exigences, Spécification §SC-001–SC-006]
- [ ] CHK027 La couverture relie-t-elle toutes les exigences à des scénarios positifs, négatifs ou de reprise ? [Qualité des exigences, Spécification §Couverture et dépendances]
- [ ] CHK028 Les observations V1 sont-elles distinctes des décisions et des mécanismes V2 restant à concevoir ? [Qualité des exigences, Spécification §Éléments probants V1, Hypothèses et limites]
- [ ] CHK029 Les besoins accessibles, les états et le passage à R02 sont-ils définis sans maquette réputée approuvée ? [Qualité des exigences, Spécification §FR-030–FR-031, A28]

## Notes

- Générée selon `speckit-checklist` ; toutes les cases restent réservées au relecteur. `speckit-implement` peut les lire sans les modifier.
- La checklist rédactionnelle `requirements.md` possède son cycle distinct Specify/Clarify.
