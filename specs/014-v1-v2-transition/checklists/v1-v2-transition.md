# Checklist de relecture : transition V1 vers V2

**Objectif** : Revue approfondie de la qualité des exigences de transition, de continuité et d’accueil avant acceptation globale.

**Créée le** : 2026-09-23

**Fonctionnalité** : [Spécification F14](../spec.md)

**Propriété** : Cette checklist appartient au relecteur. Une case cochée signifie que la qualité des exigences a été examinée et jugée satisfaisante, pas qu’une migration ou qualification a été exécutée.

## Périmètre, identité et permissions

- [ ] CHK001 La remise à zéro exceptionnelle est-elle distinguée de la suppression volontaire et de la conservation normale V2 ? [Qualité des exigences, Spécification §FR-001–FR-005, A15–A18]
- [ ] CHK002 Les informations protégées incluent-elles identités, associations, attribution des adresses et ancienneté sans imposer une copie complète du profil ? [Qualité des exigences, Spécification §FR-002, FR-013–FR-015, A07–A08, A12–A13]
- [ ] CHK003 Les permissions courantes et l’isolation empêchent-elles une ancienne session ou donnée locale de fournir des privilèges implicites ? [Qualité des exigences, Spécification §FR-003, FR-006, A04, A17]
- [ ] CHK004 Les obligations de suppression et de confidentialité survivent-elles explicitement à la remise à zéro, y compris les dossiers externes ? [Qualité des exigences, Spécification §FR-004, FR-018, A15, A18]
- [ ] CHK005 Les états personnels non repris sont-ils décrits sans promesse de récupération ni transfert par similarité ? [Qualité des exigences, Spécification §FR-001, FR-005, A16, A24]

## Accueil et récupération Pro

- [ ] CHK006 La reconnexion obligatoire de transition est-elle délimitée sans nouvelle identité ni répétition à chaque lancement après succès ? [Qualité des exigences, Spécification §FR-006, A04–A05]
- [ ] CHK007 Le public de l’accueil, sa position avant connexion, sa fermeture et sa non-répétition sur l’installation sont-ils explicites ? [Qualité des exigences, Spécification §FR-007, A01–A02]
- [ ] CHK008 Le contenu distingue-t-il données non reprises, identité conservée et droits Pro sans annoncer un abonnement perdu ? [Qualité des exigences, Spécification §FR-008, FR-012, A01, A09–A10]
- [ ] CHK009 Accueil de transition et onboarding habituel ont-ils des achèvements distincts sans sélection de suivis imposée ? [Qualité des exigences, Spécification §FR-008–FR-009, A01–A02]
- [ ] CHK010 L’installation neuve sans preuve V1 dispose-t-elle d’un parcours défini et d’une aide Pro accessible ? [Qualité des exigences, Spécification §FR-010, A03]
- [ ] CHK011 L’accès à la restauration exige-t-il un compte utilisable et une action explicite sans mutation implicite au retour de connexion ? [Qualité des exigences, Spécification §FR-011, A05–A06]
- [ ] CHK012 Les états Pro, panne, absence d’achat et incertitude reprennent-ils F09 sans publicité ou rachat induit par une panne ? [Qualité des exigences, Spécification §FR-012, A09–A11]
- [ ] CHK013 La limite entre restauration du store payeur et récupération assistée de l’autre store est-elle compréhensible ? [Qualité des exigences, Spécification §FR-012, FR-016, A11]

## Continuité et preuves préalables

- [ ] CHK014 Le rapprochement couvre-t-il toute la population concernée et les catégories principale, liée, historique et anonyme pertinentes ? [Qualité des exigences, Spécification §FR-014, A12]
- [ ] CHK015 Les associations inconnues et informations indispensables sont-elles bloquantes avant leur destruction, sans recours à l’aide Pro comme substitution ? [Qualité des exigences, Spécification §FR-015–FR-016, FR-034, A13]
- [ ] CHK016 Les résultats à qualifier couvrent-ils les deux stores et les cas qui ne sont pas démontrés par un simple achat ou une restauration ordinaire ? [Qualité des exigences, Spécification §FR-016, A11–A13]
- [ ] CHK017 Les changements jusqu’à la bascule et événements retardés conservent-ils les décisions les plus récentes ? [Qualité des exigences, Spécification §FR-017, A14, A29]
- [ ] CHK018 La suppression acceptée en cours et la protection d’un futur nouveau compte restent-elles cohérentes avec F05/F09 ? [Qualité des exigences, Spécification §FR-018, A15]
- [ ] CHK019 Les cadeaux, achats et droits indépendants sont-ils conservés selon leur validité sans assimiler migration et suppression fournisseur ? [Qualité des exigences, Spécification §FR-019, A09, A14]

## Logos et reconstruction sportive

- [ ] CHK020 La preuve préalable exige-t-elle les associations et fichiers de tous les logos de clubs concernés, indépendamment de l’état détruit ? [Qualité des exigences, Spécification §FR-020–FR-021, A19–A20]
- [ ] CHK021 Fichier manquant et rattachement encore ambigu sont-ils distingués sans faux succès ni rapprochement sur le seul nom ? [Qualité des exigences, Spécification §FR-021–FR-022, A20–A21]
- [ ] CHK022 L’héritage F02 et la limite aux seuls logos de clubs excluent-ils une extension de migration non décidée ? [Qualité des exigences, Spécification §FR-023, A21]
- [ ] CHK023 La cible saisonnière et les décisions automatiques F01/F02 excluent-elles l’approbation humaine des poules et les seuils de couverture inventés ? [Qualité des exigences, Spécification §FR-024–FR-025, A22–A23]
- [ ] CHK024 Lacune source, observation partielle et défaut V2 restent-ils distincts sans affaiblir la conservation normale de l’historique ? [Qualité des exigences, Spécification §FR-025–FR-026, A23]
- [ ] CHK025 Les imports, reprises et nouveaux événements sont-ils distingués sans rafale ni anciens destinataires inventés ? [Qualité des exigences, Spécification §FR-027, A24]

## Retrait de V1 et récupération

- [ ] CHK026 La disponibilité effective sur les deux stores est-elle une condition distincte d’une approbation ou d’une URL valide ? [Qualité des exigences, Spécification §FR-028, A25]
- [ ] CHK027 Les restrictions F12 et les accès légaux/assistance priment-ils sur l’accueil et les anciens accès ? [Qualité des exigences, Spécification §FR-029, A26]
- [ ] CHK028 Le retrait effectif couvre-t-il clients déjà connectés, appels directs et interférences partagées sans preuve réduite à un écran mobile ? [Qualité des exigences, Spécification §FR-030, A27]
- [ ] CHK029 La dépendance de rôle à la connexion inclut-elle les personnes sans rôle préalable sans nouveau privilège implicite ? [Qualité des exigences, Spécification §FR-031, A28]
- [ ] CHK030 La fin des collectes et travaux V1 est-elle distincte de la maintenance et respecte-t-elle les opérations acceptées ? [Qualité des exigences, Spécification §FR-017, FR-032, A29]
- [ ] CHK031 Les destinations, badges et messages déjà remis ont-ils des règles d’isolation et des limites de rappel explicites ? [Qualité des exigences, Spécification §FR-033, A30]
- [ ] CHK032 Les conditions avant destruction et ouverture distinguent-elles preuve manquante, lacune source et défaut de qualification ? [Qualité des exigences, Spécification §FR-034–FR-035, A13, A20, A31–A32]
- [ ] CHK033 La récupération après ouverture cible-t-elle V2 sans obligation de retour V1 ni annulation supposée des modifications de données ? [Qualité des exigences, Spécification §FR-036–FR-037, A33–A34]
- [ ] CHK034 Les résultats d’exploitation et de qualification évitent-ils diagnostics personnels, durée arbitraire et faux rétablissement ? [Qualité des exigences, Spécification §FR-038–FR-039, A35]
- [ ] CHK035 Les critères de réussite, preuves V1 et besoins R02 distinguent-ils qualité rédactionnelle, qualification future et réalisation ? [Qualité des exigences, Spécification §FR-040, SC-001–SC-006, A36, Couverture et dépendances]

## Notes

- Générée selon `speckit-checklist` ; les cases restent réservées au relecteur et ne sont pas modifiées par `speckit-implement`.
- La checklist `requirements.md` possède le cycle rédactionnel distinct Specify/Clarify.
- Cette revue n’autorise ni opération fournisseur ni mise à zéro, et ne remplace pas R01/R02 ou les qualifications futures.
