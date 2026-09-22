# Spécification fonctionnelle : signalements et suggestions d’amélioration

**Branche** : `feature/268-reports-feature-suggestions`

**Créée le** : 2026-09-22

**Statut** : Brouillon

**Périmètre demandé** : F10, [#268](https://github.com/blockoutproject/blockout/issues/268), V1-15 et suggestions V2 dans la [carte des spécifications](../../docs/product/specification-perimeters.md). Permettre à une personne, connectée ou invitée, de transmettre une demande complète et privée à l’assistance, sans conversation ni suivi de résolution intégrés.

Les acteurs sont la personne qui prépare une demande et les intervenants autorisés à la traiter. L’envoi complet signifie que le contenu et toutes les images sélectionnées sont transmis et rattachés au même dossier accessible aux intervenants autorisés. Une création intermédiaire de ticket ne vaut pas acceptation complète. Les choix techniques V1 sont des preuves historiques, pas l’architecture V2.

## Scénarios utilisateurs et validation

### Parcours 1 — Expliquer un problème ou une amélioration (Priorité : P1)

La personne utilise un formulaire commun, accessible même lorsque sa connexion ou le chargement d’une fiche échoue.

**Justification de la priorité** : L’assistance doit rester utilisable précisément quand un autre parcours ne fonctionne pas.

**Validation indépendante** : Décrire la demande d’un invité et celle d’une personne connectée, leurs champs obligatoires et leur contexte malgré un échec de chargement.

1. **A01** — **Étant donné** un invité ou une personne connectée, **lorsqu’**elle accède à l’assistance, **alors** le même formulaire permet un problème ou une suggestion ; un échec de connexion ou de chargement ne supprime pas le point d’entrée pertinent. (FR-001, FR-002)
2. **A02** — **Étant donné** une nature choisie, **lorsque** la personne prépare une demande, **alors** le sujet peut rester absent ; une proposition issue du contexte reste modifiable. Un problème de logo relève des données sportives. (FR-002, FR-003)
3. **A03** — **Étant donné** un problème ou une suggestion, **lorsque** le titre ou la description manque ou ne contient que des espaces, **alors** l’envoi est refusé avec explication sans perdre les autres champs. Une suggestion utilise le même formulaire avec une aide adaptée au besoin et à l’amélioration souhaitée. (FR-004, FR-017)
4. **A04** — **Étant donné** une adresse connue ou absente, **lorsque** la personne prépare l’envoi, **alors** elle peut modifier l’adresse préremplie ; l’absence ou un format invalide empêche l’envoi, sans vérification de possession ni promesse de délivrabilité. (FR-005)
5. **A05** — **Étant donné** une fiche de match inaccessible mais une cible de navigation connue, **lorsque** la demande est préparée, **alors** le type et l’identifiant visés sont joints avec le contexte fiable ; aucun nom inconnu n’est inventé. (FR-006)
6. **A06** — **Étant donné** une connexion échouée, **lorsque** le contexte est joint, **alors** méthode, étape et motif sûr ou référence utile peuvent être transmis ; aucun mot de passe, jeton, justificatif de paiement, journal brut ou contenu fournisseur brut n’est joint automatiquement. (FR-006, FR-007)
7. **A07** — **Étant donné** une demande de récupération de compte ou de Pro, **lorsque** l’adresse et les identifiants déclarés sont reçus, **alors** ils servent au traitement sans établir la propriété ; les décisions restent soumises aux preuves F05/F09. (FR-008, FR-028)

### Parcours 2 — Préparer les images et conserver sa saisie (Priorité : P1)

La personne peut illustrer sa demande sans capture obligatoire et sans perdre son texte lors d’une difficulté de préparation.

**Justification de la priorité** : Une pièce facultative ne doit pas rendre le formulaire inutilisable ni exposer le reste de la photothèque.

**Validation indépendante** : Comparer les demandes sans image, avec cinq images admissibles et avec une image refusée, puis les retours temporaires et l’abandon.

1. **A08** — **Étant donné** un formulaire valide sans image, **lorsque** l’envoi est demandé, **alors** aucune capture n’est exigée. Jusqu’à cinq images admissibles peuvent être examinées et retirées avant envoi. (FR-009, FR-011)
2. **A09** — **Étant donné** cinq images sélectionnées, **lorsqu’**une sixième est ajoutée, **alors** la limite est expliquée et la sélection existante ainsi que le texte restent disponibles. (FR-009, FR-012)
3. **A10** — **Étant donné** une image préparée en PNG ou JPEG, **lorsque** sa taille est de 5 Mio, **alors** elle respecte la limite ; au-delà, ou si le format est refusé, elle n’est pas acceptée et le texte reste disponible. (FR-010, FR-012)
4. **A11** — **Étant donné** une photo choisie, **lorsque** sa préparation échoue ou que l’accès aux photos est refusé, **alors** une explication permet de corriger la sélection sans conversion manuelle imposée ni perte du texte. Une image sélectionnée en erreur n’est pas omise silencieusement à l’envoi. (FR-010–FR-012, FR-018)
5. **A12** — **Étant donné** un formulaire renseigné, **lorsque** la personne effectue un aller-retour temporaire ou rencontre un échec, **alors** la saisie reste disponible pendant le parcours. Une fermeture volontaire demande confirmation de l’abandon ; aucune restauration après redémarrage n’est promise. (FR-013, FR-014)
6. **A13** — **Étant donné** une demande préparée pour un compte, **lorsque** le compte change, **alors** sa saisie n’est pas exposée au nouveau compte et aucune reprise ne réattribue la demande. (FR-015)

### Parcours 3 — Envoyer une demande entière une seule fois (Priorité : P1)

La personne reçoit soit une confirmation complète, soit un état d’échec ou d’incertitude exploitable, sans parcours de livraison partielle.

**Justification de la priorité** : Le contenu et les images choisis doivent parvenir ensemble au traitement, sans doublons dus aux reprises.

**Validation indépendante** : Parcourir les échecs avant et après création intermédiaire, la réponse perdue et la réussite complète avec alerte secondaire en panne.

1. **A14** — **Étant donné** un contenu valide et des images admissibles, **lorsque** le contenu et toutes les images sont transmis et rattachés au même dossier autorisé, **alors** une seule confirmation complète est présentée avec l’indication que les éventuels échanges passent par l’e-mail fourni. (FR-016, FR-018, FR-024)
2. **A15** — **Étant donné** un envoi dont une image ne peut pas être transmise, **lorsque** l’échec est confirmé, **alors** aucun envoi terminé n’est annoncé ; le formulaire reste disponible pour corriger ou réessayer. Aucun choix de terminer avec des images manquantes n’est proposé. (FR-017–FR-019)
3. **A16** — **Étant donné** un ticket intermédiaire créé mais un rattachement d’image échoué, **lorsque** l’opération est reprise, **alors** les effets intermédiaires sont réconciliés sans second dossier final, exposition de fichier isolé ni traitement du dossier incomplet comme finalisé. (FR-018, FR-021, FR-026)
4. **A17** — **Étant donné** une réponse perdue, **lorsque** la personne consulte ou reprend l’envoi, **alors** son résultat est établi ou reste explicitement incertain. Un envoi déjà complet retrouve sa confirmation, sans nouvelle demande. (FR-016, FR-020, FR-021)
5. **A18** — **Étant donné** un double appui ou des reprises concurrentes du même envoi, **lorsque** les traitements aboutissent, **alors** un seul dossier final existe ; une modification du formulaire n’altère pas silencieusement une opération encore incertaine. (FR-021, FR-022)
6. **A19** — **Étant donné** un envoi en cours ou incertain, **lorsque** la personne ferme le formulaire ou que l’application redémarre, **alors** cela ne prouve pas l’annulation de l’opération. L’absence de brouillon restaurable ne permet pas de déclarer un échec ni de dupliquer un envoi déjà accepté. (FR-014, FR-020–FR-023)
7. **A20** — **Étant donné** une demande complètement reçue, **lorsqu’**une alerte secondaire échoue, **alors** la demande reste acceptée ; l’échec de l’alerte est identifiable pour l’exploitation sans imposer de nouvelle soumission. (FR-025)
8. **A21** — **Étant donné** une confirmation complète, **lorsque** la personne constate une image oubliée, **alors** aucun parcours d’édition ou d’ajout au ticket n’est proposé dans l’application. Les éventuels échanges complémentaires utilisent l’e-mail. (FR-024, FR-027)
9. **A22** — **Étant donné** une absence de réseau, **lorsque** la personne tente un envoi, **alors** aucun succès ni envoi différé garanti n’est annoncé ; la saisie reste disponible pendant le parcours. Si une transmission a déjà pu avoir lieu, le résultat reste incertain jusqu’à établissement. (FR-013, FR-020, FR-030)

### Parcours 4 — Traiter la demande dans son circuit autorisé (Priorité : P1)

Les intervenants disposent d’un dossier complet et privé dans GitHub, avec les limites de leur rôle et des autres domaines.

**Justification de la priorité** : Le traitement ne doit exposer aucune donnée ni accorder de droit sur la seule base d’une déclaration.

**Validation indépendante** : Examiner les destinataires du dossier, des fichiers et des alertes, ainsi que les demandes touchant à la modération, au compte et à Pro.

1. **A23** — **Étant donné** un ticket et ses fichiers, **lorsqu’**un intervenant les consulte, **alors** l’accès est réservé aux personnes autorisées à cette finalité, y compris pour les fichiers séparés. Aucun contenu personnel ne paraît dans un espace public ou une notification secondaire. (FR-025, FR-026)
2. **A24** — **Étant donné** un problème ou une suggestion reçus, **lorsque** l’opérateur les traite, **alors** GitHub reste son outil et son historique ; les réponses éventuelles utilisent l’e-mail. Aucun délai garanti, réalisation promise, messagerie intégrée ou suivi de résolution dans l’application n’est déduit. (FR-027)
3. **A25** — **Étant donné** un problème concernant un lien de diffusion, **lorsqu’**il est envoyé à l’assistance, **alors** aucun signalement F08 n’est compté et aucun lien n’est masqué par cet envoi ; le parcours de modération reste distinct. Si le match est masqué, ni le dossier ni sa confirmation ne le réexposent dans l’application. (FR-028)
4. **A26** — **Étant donné** un intervenant autorisé au dossier, **lorsqu’**il traite une demande Pro ou une correction sportive, **alors** cet accès ne lui accorde pas les permissions F09 ou F02. Une demande ne corrige pas automatiquement les données sportives et ne fusionne pas de comptes. (FR-008, FR-028)
5. **A27** — **Étant donné** un compte supprimé ou une demande individuelle applicable, **lorsque** les données d’assistance sont examinées, **alors** F11 s’applique au ticket et aux fichiers, sans déduire leur effacement de celui du compte, ni imposer une purge périodique ou une conservation illimitée. (FR-029)
6. **A28** — **Étant donné** les états de formulaire, refus, attente, incertitude et confirmation, **lorsqu’**ils sont définis, **alors** ils appliquent le français, l’accessibilité, les erreurs compréhensibles et les limites hors ligne F13 ; R02 possède leur conception visuelle globale. (FR-030, FR-031)

### Cas limites

- Un sujet absent n’est pas une erreur ; une nature, un titre, une description ou un e-mail requis manquant empêche l’envoi.
- Retirer explicitement une image avant une nouvelle tentative après échec confirmé diffère de l’omettre silencieusement ou de modifier un ticket accepté.
- Une création intermédiaire, une acceptation complète et l’envoi de l’alerte opérateur sont trois faits distincts.
- L’absence de brouillon persistant ne supprime pas l’obligation de résoudre les effets d’une opération déjà transmise.
- Une demande d’assistance ne rend pas consultable une ressource sportive masquée et n’ouvre pas l’accès aux données personnelles d’autrui.

## Exigences

### Exigences fonctionnelles

#### Accès, nature et contexte

- **FR-001** : L’assistance DOIT être accessible aux invités et utilisateurs connectés, avant connexion et après échec d’authentification ou de chargement ; le point d’entrée pertinent ne dépend pas du succès du parcours problématique.
- **FR-002** : Le formulaire commun DOIT exiger une nature : « Signaler un problème » ou « Suggérer une amélioration ». Les deux suivent les mêmes règles de contact, confidentialité, pièces jointes et livraison.
- **FR-003** : Le sujet DOIT être facultatif, proposé uniquement depuis un contexte fiable et modifiable : fonctionnement de l’application, données sportives, compte et connexion, abonnement Pro, liens de diffusion, autre. Le logo relève des données sportives ; l’absence de classement NE DOIT PAS bloquer l’envoi.
- **FR-004** : Titre et description DOIVENT être obligatoires et non composés uniquement d’espaces. L’aide DOIT inviter à décrire le problème ou le besoin et l’amélioration souhaitée, sans champs supplémentaires obligatoires pour les suggestions.
- **FR-005** : Chaque demande DOIT comporter un e-mail de réponse prérempli si disponible et modifiable. Son format DOIT être contrôlé sans vérifier sa possession ni garantir sa délivrabilité. Sa finalité reste le traitement et la réponse, conformément à F11.
- **FR-006** : Le contexte fiable disponible DOIT être joint automatiquement : écran, action, type et identifiant de la cible de navigation même inaccessible, version de l’application, système et modèle utiles. Les données inconnues restent absentes. Un échec de connexion peut inclure méthode, étape et motif sûr ou référence utile.
- **FR-007** : Le contexte automatique NE DOIT contenir aucun mot de passe, jeton, justificatif de paiement, journal brut ou contenu fournisseur brut. Les pièces choisies volontairement restent soumises à la minimisation F11.
- **FR-008** : Une adresse, un nom ou un identifiant déclaré NE DOIT PAS prouver la propriété d’un compte ou d’un achat. L’assistance applique F05/F09 ; l’accès au dossier n’autorise aucune liaison, fusion, suppression ou attribution de droits par simple déclaration.

#### Images et saisie

- **FR-009** : Les images DOIVENT être facultatives et limitées à cinq par demande. Aucune capture ni collecte du reste de la photothèque n’est imposée.
- **FR-010** : Les images acceptées DOIVENT être en PNG ou JPEG et ne pas dépasser 5 Mio chacune après préparation, soit 5 × 1 024 × 1 024 octets. La préparation des photos choisies DOIT éviter une conversion manuelle imposée ; aucun outil, dimension ou taux de compression n’est prescrit ici.
- **FR-011** : La personne DOIT pouvoir examiner et retirer les images choisies avant envoi.
- **FR-012** : Limite dépassée, format refusé, permission refusée ou préparation échouée DOIVENT être expliqués sans perte du texte ni des autres pièces valides. Une pièce sélectionnée mais non prête DOIT être corrigée ou retirée explicitement avant envoi.
- **FR-013** : La saisie DOIT rester disponible pendant le parcours après échec ou aller-retour temporaire. Cette règle ne crée pas de brouillon persistant après redémarrage.
- **FR-014** : La fermeture volontaire d’un formulaire renseigné DOIT demander confirmation d’abandon. Abandonner la saisie NE DOIT PAS être assimilé à l’annulation d’une opération déjà transmise.
- **FR-015** : Le changement de compte DOIT appliquer l’isolation F05 : aucune exposition de la saisie précédente ni réattribution silencieuse de la demande ou de ses reprises au nouveau compte.

#### Envoi complet et reprises

- **FR-016** : L’envoi DOIT distinguer validation refusée, opération en cours, échec confirmé, résultat incertain et acceptation complète ; aucun état intermédiaire ne vaut confirmation de réussite.
- **FR-017** : Une validation refusée ou un échec confirmé DOIT expliquer le problème et conserver le formulaire pendant le parcours pour correction ou nouvelle tentative, sans effets dupliqués lors de la reprise.
- **FR-018** : L’acceptation DOIT porter sur le contenu et toutes les images sélectionnées, transmis et rattachés au même dossier accessible aux intervenants autorisés. Aucune image sélectionnée ne peut être omise silencieusement ; aucun dossier incomplet ne peut être traité comme une demande finalisée.
- **FR-019** : L’application NE DOIT PAS proposer de terminer un envoi avec des images sélectionnées non transmises. Après échec confirmé, la personne peut corriger sa sélection avant de réessayer ; ce n’est pas l’édition d’un ticket accepté.
- **FR-020** : Un résultat incertain DOIT pouvoir être établi ou repris sans déclarer prématurément succès, échec ou annulation. Une réponse perdue après acceptation complète DOIT permettre de retrouver ce résultat sans nouvelle demande.
- **FR-021** : Doubles appuis, reprises et traitements concurrents d’un même envoi DOIVENT produire au maximum un dossier final. Les effets intermédiaires DOIVENT être réconciliés sans doublon volontaire, fichier exposé isolément ni dossier incomplet traité comme finalisé. La solution technique appartient au plan ultérieur.
- **FR-022** : Les changements de saisie NE DOIVENT PAS altérer silencieusement une opération encore en cours ou incertaine ; son résultat doit être établi avant une nouvelle soumission corrigée susceptible de la dupliquer.
- **FR-023** : Une fermeture ou un redémarrage NE DOIT PAS prouver l’annulation d’un envoi transmis. L’absence de restauration du brouillon n’autorise ni faux échec ni duplication d’un envoi déjà accepté.
- **FR-024** : Après acceptation complète, une confirmation compréhensible DOIT indiquer que les échanges éventuels passent par l’e-mail fourni. L’application NE DOIT proposer ni édition du ticket ni ajout d’image oubliée après confirmation.
- **FR-025** : Une alerte secondaire à l’opérateur DOIT rester indépendante de l’acceptation complète. Son échec doit être identifiable pour l’exploitation sans invalider le dossier ni imposer une nouvelle soumission. Elle NE DOIT contenir aucune copie de contenu personnel, conformément à F11 ; aucun mécanisme de notification n’est sélectionné.

#### Traitement et responsabilités

- **FR-026** : Le ticket, les coordonnées et toutes les pièces, même stockées séparément, DOIVENT rester accessibles uniquement aux intervenants autorisés à cette finalité. Un espace public ou une URL de fichier sans contrôle d’accès ne satisfait pas cette exigence ; les erreurs intermédiaires conservent ces protections.
- **FR-027** : GitHub DOIT rester l’outil privé de traitement et l’historique opérateur ; les réponses éventuelles utilisent l’e-mail fourni. Aucun dialogue intégré, suivi de résolution dans l’application, accusé par e-mail automatique, délai de réponse garanti ou promesse de réalisation d’une suggestion n’est ajouté.
- **FR-028** : F10 DOIT rester distinct du signalement de modération F08 : un ticket d’assistance ne compte pas dans ses seuils et ne masque aucun lien. Les interventions sportives, d’identité et Pro restent soumises aux décisions et permissions F02/F05/F09 ; le dossier ne contourne pas la visibilité sportive F02/F03. F12 attribue les permissions sans autorisation générale implicite du modérateur.
- **FR-029** : F11 DOIT gouverner finalités, minimisation, demandes applicables d’effacement et conservation du ticket et des fichiers. La suppression du compte ne prouve pas l’effacement de ces copies ; aucune purge périodique, échéance après clôture ou conservation illimitée n’est ajoutée.
- **FR-030** : Le formulaire et ses états DOIVENT appliquer F13 : français, accessibilité, erreurs compréhensibles, diagnostics sûrs et limites hors ligne. Une absence de réseau ne vaut ni succès ni engagement d’envoi différé ; aucune file d’actions hors ligne nouvelle n’est requise.
- **FR-031** : R02 DOIT couvrir globalement le formulaire guidé, la sélection et revue des images, les refus, l’abandon, l’envoi en cours, l’incertitude et la confirmation. F10 ne déclare aucun écran approuvé et n’impose pas la présentation d’une application tierce.

### Entités fonctionnelles

- **Demande** : nature, sujet facultatif, titre, description, e-mail de réponse et contexte fiable ; elle ne constitue pas une preuve d’identité.
- **Sélection d’images** : au plus cinq pièces facultatives examinables, prêtes ou en erreur avant soumission.
- **Opération d’envoi** : contenu soumis et résultat à établir ; sa reprise se distingue d’une nouvelle demande et d’une édition après acceptation.
- **Dossier accepté** : contenu et toutes les images rattachés, utilisables uniquement dans le circuit autorisé.
- **Alerte secondaire** : signal destiné à l’exploitation, indépendant de la réception complète et sans duplication de contenu personnel non autorisée.

## Critères de réussite

- **SC-001** : A01–A07 permettent les deux natures de demande sans compte, sans classement obligatoire et sans données inventées. Tous les dossiers acceptés disposent d’un titre, d’une description et d’un e-mail valides ; aucune déclaration de contact ne vaut preuve d’identité.
- **SC-002** : A08–A13 respectent cinq images et 5 Mio par image, sans capture obligatoire ni perte de texte après refus. Aucun changement de compte n’expose ou ne réattribue la saisie précédente.
- **SC-003** : A14–A19 et A22 produisent zéro confirmation complète avec image sélectionnée manquante, zéro dossier final dupliqué et zéro faux résultat après réponse perdue. Les effets intermédiaires ne constituent jamais un dossier final incomplet.
- **SC-004** : A20–A21 distinguent intégralement la demande reçue de l’alerte secondaire ; aucun échec d’alerte n’impose une nouvelle soumission, et aucun parcours d’édition après confirmation n’est requis.
- **SC-005** : A23–A27 exposent zéro contenu personnel à une destination non autorisée et n’accordent aucun pouvoir F02/F05/F08/F09 sur la seule base du ticket. Les obligations d’effacement couvrent les copies concernées selon F11.
- **SC-006** : A28 définit les états accessibles et les besoins R02 sans présenter la qualité rédactionnelle comme une implémentation, une qualification fournisseur ou une conception approuvée.

## Hypothèses et limites

- GitHub est un choix opérateur accepté ; stockage, notifications secondaires, architecture et mécanismes de reprise restent à déterminer depuis les exigences V2. Les garanties d’envoi complet devront être qualifiées avant mise en service, pas déduites d’une transaction locale.
- Aucun SLA de réponse, vote public, catalogue de suggestions, statut de ticket dans l’application ni notification F07 d’assistance n’est ajouté. L’opérateur traite les demandes au cas par cas dans son circuit autorisé.
- La conservation de saisie concerne le parcours courant ; les obligations sur les effets d’un envoi transmis subsistent indépendamment du brouillon. Une reprise sûre n’exige pas d’exposer un historique de tickets.
- Les limites générales de qualité et de protection contre les abus restent celles de F13 ; aucun quota produit supplémentaire, authentification obligatoire ou nouveau parcours de vérification d’e-mail n’est introduit.
- R01, R02 et l’acceptation globale sous #247 précèdent la planification technique. Cette livraison décrit les résultats attendus, sans API, schéma, migration ou qualification de disponibilité de production.

## Éléments probants V1

| Source                                                                                                                                                                                                                                                                                       | Observation et limite                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Formulaire](../../apps/frontend/mobile/src/modules/report/forms/report-form.tsx) et [tests](../../apps/frontend/mobile/src/modules/report/forms/__tests__/report-form.test.tsx)                                                                                                             | Catégories affichage, données, logo, live, autre ; titre et description requis ; contexte appareil et identité déclarée ; photos préparées en JPEG, largeur 1280. Pas de parcours de suggestion ni de preuve des garanties V2 de livraison. |
| [Orchestration](../../apps/backend/reports-service/src/main/java/com/blockout/reports/report/application/ReportApplicationService.java)                                                                                                                                                      | Images PNG/JPEG, limite de 5 × 1024 × 1024 octets, téléversement avant création du ticket, puis rattachement ; alerte secondaire indépendante. Aucune atomicité de livraison complète n’en est déduite.                                     |
| [Fournisseur GitHub](../../apps/backend/reports-service/src/main/java/com/blockout/reports/report/infrastructure/providers/github/GitHubIssueProvider.java)                                                                                                                                  | L’erreur de rattachement des images est journalisée puis absorbée ; une réponse réussie peut donc ne pas démontrer leur présence dans le ticket. Cette observation ne satisfait pas FR-018.                                                 |
| [Composition](../../apps/backend/reports-service/src/main/java/com/blockout/reports/report/application/IssueDraftFactory.java) et [alerte Discord](../../apps/backend/reports-service/src/main/java/com/blockout/reports/report/infrastructure/providers/discord/DiscordReportNotifier.java) | Catégories converties en labels et contexte dans le corps ; alerte comportant notamment le titre. La V2 doit respecter F11 indépendamment de ce contenu historique. Ni paramètres de production ni accès effectifs n’ont été inspectés.     |
| [Contrat public](../../libs/shared/contracts/specs/source/services/mobile-gateway/paths/report.json) et [contrat interne](../../libs/shared/contracts/specs/source/services/report/paths/reports.json)                                                                                       | Création de signalement ; aucune conversation ni fonction de suivi utilisateur à préserver n’est établie par ces contrats. Ils ne sélectionnent pas le contrat V2.                                                                          |
| [Inventaire V1](../../docs/product/v1-functional-inventory.md) et [issue #268](https://github.com/blockoutproject/blockout/issues/268)                                                                                                                                                       | V1-15 et extension approuvée aux suggestions. Le plan approuvé fixe le formulaire commun, le sujet facultatif, cinq images, la saisie pendant le parcours et l’envoi entier sans édition ultérieure.                                        |

## Couverture et dépendances

| Domaine                                                           | Exigences     | Scénarios         | Critères       |
| ----------------------------------------------------------------- | ------------- | ----------------- | -------------- |
| V1-15 et suggestions : accès, champs, contexte, identité déclarée | FR-001–FR-008 | A01–A07           | SC-001         |
| Images, saisie, abandon et isolation                              | FR-009–FR-015 | A08–A13, A19      | SC-002, SC-003 |
| Envoi entier, incertitude, concurrence et reprise                 | FR-016–FR-023 | A14–A19, A22      | SC-003         |
| Confirmation et alerte indépendante                               | FR-024–FR-025 | A14, A20–A21, A23 | SC-004, SC-005 |
| Traitement privé et frontières métier                             | FR-026–FR-029 | A07, A16, A23–A27 | SC-005         |
| Qualité et conception globale                                     | FR-030–FR-031 | A22, A28          | SC-006         |

| Périmètre                                                                                                                                  | Responsabilité                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F02](../002-sporting-data/spec.md), [F03](../007-sporting-consultation/spec.md)                                                           | Identité et visibilité sportives, contexte des cibles et interventions autorisées ; aucun rétablissement de ressource par l’assistance.                    |
| [F05](../005-accounts-identity/spec.md), [F09](../006-pro-subscriptions/spec.md)                                                           | Accès invité, isolation, preuve de propriété, suppression et récupération des droits ; l’accès au dossier ne confère pas les pouvoirs de récupération Pro. |
| [F08](../010-live-contributions-moderation/spec.md), [F07](../011-notifications-delivery/spec.md)                                          | Modération des liens et boîte personnelle distinctes de l’assistance ; aucun seuil de modération ni avis personnel d’assistance créé ici.                  |
| [F11](../004-advertising-privacy-legal/spec.md)                                                                                            | FR-028–FR-034, A20–A24 : contact, contexte, confidentialité, GitHub, envoi entier et reprise sûre ; finalités, accès et effacement restent communs.        |
| [F13](../003-shared-quality/spec.md), F12 / [#269](https://github.com/blockoutproject/blockout/issues/269)                                 | Qualité, sécurité et diagnostics ; attribution des permissions selon la finalité.                                                                          |
| R01 / [#271](https://github.com/blockoutproject/blockout/issues/271), R02 / [#272](https://github.com/blockoutproject/blockout/issues/272) | Cohérence transversale puis conception globale des parcours et états ; aucune approbation visuelle déduite de cette spec.                                  |
