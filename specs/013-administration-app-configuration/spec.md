# Spécification fonctionnelle : administration commune et configuration de l’accès

**Branche** : `feature/269-administration-app-configuration`

**Créée le** : 2026-09-23

**Statut** : Brouillon

**Périmètre demandé** : F12, [#269](https://github.com/blockoutproject/blockout/issues/269), administration commune et accès V1-20 dans la [carte des spécifications](../../docs/product/specification-perimeters.md). Définir les permissions, la maintenance effective, les versions minimales, les erreurs de configuration et la récupération opérateur, sans redéfinir les commandes des autres domaines.

Les acteurs sont le visiteur, le titulaire d’un compte utilisable, l’opérateur disposant de permissions précises et le propriétaire du produit. « Propriétaire » dans l’attribution des privilèges et le circuit de secours désigne ce dernier, pas le propriétaire d’un compte ou d’une contribution. La maintenance limite temporairement l’accès ordinaire ; elle ne change ni l’identité des ressources, ni les droits métier, ni les commandes de collecte.

## Scénarios utilisateurs et validation

### Parcours 1 — Accéder aux seules commandes autorisées (Priorité : P1)

Un compte reçoit ses capacités ordinaires ; un opérateur ne dispose que des commandes qui lui ont été confiées.

**Justification de la priorité** : Éviter les privilèges implicites sans imposer une attribution manuelle aux utilisateurs ordinaires.

**Validation indépendante** : Comparer un invité, un compte utilisable, un opérateur et le propriétaire avec des permissions différentes.

1. **A01** — **Étant donné** un nouveau compte utilisable, **lorsque** ses capacités sont établies, **alors** les actions ordinaires sont disponibles sous leurs conditions métier, notamment les sept jours F08 ; aucun privilège administratif ne lui est attribué. (FR-001)
2. **A02** — **Étant donné** le propriétaire et un opérateur délégué, **lorsque** ils tentent une attribution ou un retrait de permission privilégiée, **alors** seul le propriétaire est autorisé ; l’opérateur ne redistribue pas ses droits et ne s’en accorde pas. (FR-002)
3. **A03** — **Étant donné** un opérateur autorisé à gérer la maintenance, **lorsque** il tente de modifier les versions ou de contourner la maintenance, **alors** ces actions exigent chacune leur permission distincte ; l’accès à l’administration ne suffit pas. (FR-003, FR-004, FR-014)
4. **A04** — **Étant donné** un modérateur des liens ou un gestionnaire F12, **lorsque** il tente une relance F01, une correction F02, une édition F11 ou une opération Pro F09, **alors** les permissions du domaine sont exigées et les pouvoirs Pro réservés au propriétaire restent réservés. (FR-004, FR-005)
5. **A05** — **Étant donné** un invité, un compte sans permission, une permission révoquée ou une ancienne session, **lorsque** une action protégée est demandée, même par appel direct, **alors** le refus laisse les données inchangées et aucun droit implicite ne résulte d’un bouton affiché. (FR-005)

### Parcours 2 — Préparer et publier des réglages sans effet involontaire (Priorité : P1)

L’opérateur prépare le contenu et distingue son enregistrement de l’activation du blocage.

**Justification de la priorité** : Limiter les blocages accidentels et les pertes de saisie ou de décisions plus récentes.

**Validation indépendante** : Préparer le contenu à l’arrêt, l’activer, corriger une erreur et examiner un enregistrement concurrent.

1. **A06** — **Étant donné** une maintenance inactive puis active, **lorsque** le message ou l’image est enregistré, **alors** l’état reste respectivement inactif ou actif ; seules les commandes explicites activent ou désactivent le blocage. (FR-006)
2. **A07** — **Étant donné** un message vide ou composé d’espaces, **lorsque** le contenu est enregistré ou la maintenance activée, **alors** l’opération est refusée ; un message valide suffit sans image. (FR-007, FR-010)
3. **A08** — **Étant donné** une image facultative renseignée, **lorsque** elle est retirée explicitement ou devient indisponible à l’affichage, **alors** son retrait est effectif sans modification des autres réglages ; l’indisponibilité n’empêche ni message ni reprise. (FR-007, FR-008, FR-031)
4. **A09** — **Étant donné** des réglages de maintenance et de versions connus, **lorsque** un seul groupe ou champ est modifié, **alors** les autres restent inchangés ; une valeur retirée explicitement ne se confond pas avec un champ non modifié. (FR-008, FR-030)
5. **A10** — **Étant donné** une configuration non chargée ou une saisie non enregistrée, **lorsque** le chargement échoue ou une actualisation arrive, **alors** aucune valeur par défaut ne vaut état publié et la saisie n’est pas écrasée silencieusement. (FR-009, FR-010)
6. **A11** — **Étant donné** un refus ou un échec confirmé d’enregistrement, **lorsque** le résultat est présenté, **alors** le dernier état accepté reste intact, avec une explication et une reprise appropriée. (FR-009, FR-010)
7. **A12** — **Étant donné** une réponse d’enregistrement perdue ou une autre modification acceptée entre-temps, **lorsque** l’opérateur reprend, **alors** la relecture établit le résultat ; une ancienne soumission ne remplace pas silencieusement la nouvelle décision. (FR-009, FR-011)

### Parcours 3 — Comprendre le blocage et reprendre l’accès (Priorité : P1)

La personne reçoit un état d’accès fiable au lancement, sans surveillance périodique mobile.

**Justification de la priorité** : Bloquer effectivement les opérations interdites tout en gardant un parcours simple et une assistance accessible.

**Validation indépendante** : Parcourir les démarrages, caches, refus serveur et exceptions sans ajouter de minuteur.

1. **A13** — **Étant donné** une maintenance active, **lorsque** un utilisateur ordinaire lance l’application ou demande une opération directement, **alors** le blocage s’applique dans l’application et côté serveur ; un ancien lien ne le contourne pas. (FR-012, FR-015)
2. **A14** — **Étant donné** une maintenance, une mise à jour obligatoire ou une configuration indisponible, **lorsque** une personne cherche les informations légales, l’assistance ou la connexion opérateur, **alors** les entrées nécessaires restent accessibles ; une authentification ordinaire ne lève pas le blocage. (FR-013, FR-018)
3. **A15** — **Étant donné** un opérateur avec permission de contournement, **lorsque** il choisit de passer la maintenance, **alors** il peut utiliser l’application et ses commandes autorisées sans ouvrir l’accès aux autres ni acquérir de nouveau droit. (FR-014)
4. **A16** — **Étant donné** une exception opérateur personnelle, **lorsque** le compte change ou sa permission est révoquée, **alors** elle ne bénéficie pas au nouveau compte ni à l’opérateur privé de ce droit ; les contrôles courants continuent à s’appliquer. (FR-005, FR-014)
5. **A17** — **Étant donné** un démarrage à froid, un retour au premier plan puis une action « Réessayer », **lorsque** les réglages sont consultés, **alors** seuls le démarrage et la reprise explicite déclenchent cette vérification, sans interrogation périodique ni minuterie de session. (FR-015, FR-017)
6. **A18** — **Étant donné** une session déjà ouverte, **lorsque** la maintenance est activée puis une opération ordinaire est demandée, **alors** le serveur refuse cette opération et l’application applique le blocage ; sans interaction serveur, le remplacement instantané de l’écran n’est pas promis. (FR-012, FR-016)
7. **A19** — **Étant donné** une vérification au démarrage en échec, **lorsque** le dernier réglage autorisant l’accès date de cinq minutes ou de plus de cinq minutes, **alors** le premier peut servir de secours, le second non. Un secours ne renouvelle pas la vérification et ne lance pas de compte à rebours de session. (FR-017)
8. **A20** — **Étant donné** aucun état fiable admissible, ou une maintenance/mise à jour déjà connue, **lorsque** la nouvelle vérification échoue, **alors** le premier cas affiche une indisponibilité avec reprise ; dans le second, la restriction connue n’est pas levée. Un refus serveur actuel prime sur un ancien état permissif. (FR-017, FR-018, FR-031)
9. **A21** — **Étant donné** une maintenance nouvellement active, **lorsque** des actions ordinaires arrivent tandis qu’une opération courte est déjà acceptée, **alors** les nouvelles sont refusées et l’opération acceptée termine selon son domaine ; une réponse perdue reste à établir, sans annulation supposée ou dispositif général de suspension. (FR-019)
10. **A22** — **Étant donné** des collectes activées ou déjà en pause, **lorsque** la maintenance est activée puis désactivée, **alors** leur état reste inchangé ; le cycle courant et la reprise relèvent de F01, sans rattrapage implicite. (FR-020)

### Parcours 4 — Conserver les notifications sans envoyer pendant la maintenance (Priorité : P1)

Les événements admissibles alimentent la boîte personnelle sans inviter par push à utiliser une application bloquée.

**Justification de la priorité** : Préserver les annonces et leurs limites sans rafale d’avis expirés à la réouverture.

**Validation indépendante** : Créer des avis pendant le blocage, lever la maintenance avant et après leur échéance, puis comparer les destinataires.

1. **A23** — **Étant donné** un événement admissible pendant la maintenance, **lorsque** F07 traite ses destinataires, **alors** les entrées personnelles sont créées selon les règles habituelles mais aucun push ne part, même vers un opérateur pouvant contourner la maintenance. (FR-021, FR-022)
2. **A24** — **Given** a notice created at 18:00 during maintenance, **when** maintenance ends at 18:10 or 18:15, **then** delivery remains possible at 18:10 under F07 controls, but no new attempt starts at 18:15. Its original date remains unchanged and its inbox lifetime follows F07 retention. Maintenance lasting across daily purge does not retain old entries or restore them on reopening. (FR-021, FR-022; F07 A45, A50)
3. **A25** — **Étant donné** un avis dont le suivi a été retiré ou dont le live est devenu obsolète, **lorsque** la maintenance est levée avant l’échéance, **alors** l’absence de maintenance ne suffit pas à autoriser le push ; les contrôles F07 s’appliquent sans recréer l’avis. (FR-022)
4. **A26** — **Étant donné** un message remis au fournisseur avant le blocage, **lorsque** il est reçu ou ouvert pendant la maintenance, **alors** aucun rappel certain n’est promis ; l’ouverture applique le blocage courant et aucune réussite établie n’est rejouée volontairement. (FR-023)

### Parcours 5 — Mettre à jour et corriger une configuration bloquante (Priorité : P1)

La personne rejoint le bon store ; le propriétaire conserve un moyen de corriger une erreur hors de l’application.

**Justification de la priorité** : Éviter une mise à jour impossible et un blocage sans issue pour l’exploitation.

**Validation indépendante** : Comparer les deux plateformes, les versions limites, les doubles blocages et la récupération hors application.

1. **A27** — **Étant donné** des seuils distincts pour iOS et Android, **lorsque** la version installée est comparée au seuil de sa plateforme, **alors** une version inférieure est bloquée, une version égale ou supérieure satisfait la condition ; sans seuil, cette restriction ne s’applique pas. (FR-024)
2. **A28** — **Étant donné** les versions 2.9.0 et 2.10.0, un seuil invalide ou une version installée inconnue alors qu’un minimum s’applique, **lorsque** la comparaison ou l’enregistrement est demandé, **alors** l’ordre numérique est respecté, le seuil invalide est refusé et la version inconnue produit une erreur explicable avec reprise/assistance, sans valeur fictive. (FR-025)
3. **A29** — **Étant donné** un opérateur ou le propriétaire sur une version trop ancienne, **lorsque** il tente un contournement, **alors** aucune exception de version n’est accordée, même avec la permission de passer la maintenance. (FR-014, FR-026)
4. **A30** — **Étant donné** maintenance et version minimale non satisfaite, **lorsque** la maintenance est affichée puis levée ou contournée par un opérateur autorisé, **alors** le blocage de mise à jour reste applicable avant l’accès à l’application. (FR-027)
5. **A31** — **Étant donné** une hausse envisagée de minimum, **lorsque** l’opérateur prépare son activation, **alors** le lien correspond au bon store et la disponibilité de la version doit être vérifiée par l’opérateur ; une URL bien formée seule ne prouve pas cette disponibilité. (FR-028)
6. **A32** — **Étant donné** un lien de store invalide à la saisie, impossible à ouvrir ou un store indisponible, **lorsque** la configuration est enregistrée ou le parcours de mise à jour utilisé, **alors** le lien invalide est refusé ; l’échec d’ouverture donne reprise et assistance sans lever le minimum. Une ouverture réussie ne prouve pas l’installation. (FR-028, FR-029, FR-030)
7. **A33** — **Étant donné** un seuil erroné ou un message facultatif absent, **lorsque** l’opérateur corrige le seuil/lien, retire le minimum ou affiche le message, **alors** la maintenance reste inchangée ; un lien ne peut être retiré en laissant son seuil imposé, et le texte de repli ne promet pas de date ou de disponibilité vérifiée. (FR-030, FR-031)
8. **A34** — **Étant donné** une configuration qui bloque aussi les opérateurs, **lorsque** le propriétaire utilise le circuit de secours hors application, **alors** il peut corriger les réglages après les contrôles d’autorisation et vérifier le rétablissement ; un autre opérateur ne reçoit pas cet accès et une commande exécutée ne suffit pas à prouver le succès. (FR-032, FR-033)
9. **A35** — **Étant donné** les parcours de configuration, restriction et récupération, **lorsque** leurs résultats et leur qualification sont examinés, **alors** F13 s’applique aux permissions, diagnostics, accessibilité et disponibilité, maintenance incluse. F14 reçoit les contraintes de transition et R02 les états à concevoir, sans architecture ni écran réputé approuvé. (FR-034, FR-035, FR-036)

### Cas limites

- Une indisponibilité de configuration n’est ni la preuve d’une maintenance ni une autorisation nouvelle. Une ancienne restriction connue ne disparaît pas avec l’âge du cache.
- Les cinq minutes bornent le secours au démarrage ; elles ne deviennent ni une fréquence d’interrogation ni un délai de grâce face à un refus serveur courant.
- Un passage explicite de maintenance est individuel ; la version minimale et chaque permission métier restent applicables.
- Retirer un seuil ou une image est une modification explicite ; ne pas modifier un champ conserve sa valeur.
- Maintenance does not itself suspend collection, cancel payments or erase notifications; it also does not pause F07 retention or daily purge.

## Exigences

### Exigences fonctionnelles

#### Permissions et attribution

- **FR-001** : Un nouveau compte utilisable DOIT recevoir automatiquement les capacités ordinaires prévues par les specs, sans attribution manuelle, en conservant propriété, visibilité, ancienneté F08, quotas et autres conditions métier. Aucun privilège administratif ou de modération ne doit être accordé automatiquement.
- **FR-002** : Seul le propriétaire du produit DOIT pouvoir attribuer ou retirer les permissions privilégiées dans un circuit autorisé. Un opérateur NE DOIT ni redistribuer ses droits ni s’en accorder. Aucune console générique de gestion des comptes ou permissions n’est ajoutée.
- **FR-003** : Gestion de la maintenance et de son contenu, gestion des versions minimales/messages/liens stores, et contournement de maintenance DOIVENT être trois permissions distinctes ; disposer de l’une ne fournit pas les autres.
- **FR-004** : Chaque commande DOIT conserver son propriétaire fonctionnel et ses permissions : F01 collecte et saisons, F02 données et présentation sportives, F08 modération, F09 droits Pro, F11 édition légale. L’accès à l’administration NE DOIT PAS conférer un pouvoir général. Les pouvoirs F09 réservés au propriétaire restent réservés malgré une délégation F12. Les corrections de coordonnées de clubs, absences volontaires et retours à la source relèvent de F02 FR-047–FR-052 et de leur permission métier, sans nouveau formulaire mobile imposé.
- **FR-005** : Toute action protégée DOIT vérifier les droits courants du compte, de l’action et de la ressource, indépendamment de la visibilité du contrôle. Une permission absente, révoquée ou inexploitable ne fournit aucun droit implicite ; refus et réponse d’une ancienne session respectent F05/F13.

#### Contenu et enregistrement des réglages

- **FR-006** : Enregistrer le message ou l’image de maintenance DOIT conserver son état actif ou inactif. Activation et désactivation DOIVENT être des commandes explicites distinctes de la préparation du contenu.
- **FR-007** : Le message de maintenance enregistré DOIT être non vide et non composé uniquement d’espaces ; l’activation exige un message exploitable. L’image reste facultative et peut être retirée explicitement. Une image invalide à la saisie doit être signalée ; son indisponibilité à l’affichage ne bloque ni le message ni les actions de reprise.
- **FR-008** : Une modification DOIT respecter son périmètre : les réglages de maintenance ne changent pas ceux des versions, et inversement ; les champs non modifiés conservent leur valeur. Retirer explicitement un champ facultatif ne doit pas être confondu avec le laisser inchangé.
- **FR-009** : L’administration DOIT distinguer chargement, configuration connue, saisie non enregistrée, refus, échec confirmé, résultat incertain et enregistrement confirmé. Un échec de chargement NE DOIT PAS présenter des valeurs par défaut comme l’état publié ni autoriser leur enregistrement comme si cet état était connu.
- **FR-010** : Un refus de validation ou un échec confirmé DOIT préserver le dernier état accepté et rendre la correction ou reprise compréhensible. Un rafraîchissement NE DOIT PAS effacer silencieusement une saisie non enregistrée.
- **FR-011** : Un enregistrement dont la réponse est perdue DOIT pouvoir être vérifié par relecture avant répétition. Une modification concurrente plus récente NE DOIT PAS être écrasée silencieusement par une ancienne réponse ou soumission ; exposer le conflit et permettre une reprise sur l’état courant sans imposer une nouvelle architecture.

#### Maintenance et contrôle d’accès

- **FR-012** : La maintenance DOIT bloquer les fonctionnalités ordinaires dans l’application et les opérations correspondantes côté serveur. Un appel direct, ancien lien ou écran conservé NE DOIT PAS contourner un refus courant. Ce blocage ne constitue ni effacement des données ni retrait sportif.
- **FR-013** : Les informations légales, l’assistance F10/F11, l’authentification nécessaire à l’identification d’un opérateur et les commandes d’exploitation autorisées pour sortir du blocage DOIVENT rester accessibles malgré la restriction ordinaire. Authentifier un utilisateur ordinaire ne lui ouvre pas l’application. Ces exceptions ne garantissent pas la disponibilité d’un fournisseur en panne et n’élargissent pas les permissions.
- **FR-014** : Un opérateur disposant de la permission de contournement DOIT pouvoir choisir explicitement de passer la maintenance pour utiliser l’application et ses commandes autorisées. Cette exception est personnelle, ne désactive pas la maintenance globale et ne fournit aucun autre droit. Elle NE DOIT profiter ni à un autre compte ni à une permission révoquée et ne contourne jamais une version minimale.
- **FR-015** : Les réglages d’accès DOIVENT être vérifiés au démarrage à froid, puis sur l’action explicite « Réessayer ». Un simple retour au premier plan NE DOIT PAS relancer ce contrôle. Aucun minuteur, interrogation périodique mobile ou synchronisation permanente de l’écran n’est requis.
- **FR-016** : Si la maintenance est activée pendant une session, le serveur DOIT refuser la prochaine opération ordinaire et l’application DOIT appliquer le blocage à réception de ce refus. Aucun remplacement instantané d’un écran déjà affiché sans interaction serveur n’est promis ; aucune lecture répétée de configuration côté mobile n’est ajoutée pour obtenir cet effet.
- **FR-017** : En cas d’échec de la vérification au démarrage, un dernier réglage autorisant l’accès PEUT servir de secours seulement s’il a été vérifié avec succès depuis au plus cinq minutes. Cette borne est évaluée au démarrage, pas par expiration automatique de la session. Une utilisation du cache ne renouvelle pas sa date de vérification ; un refus actuel du serveur reste prioritaire.
- **FR-018** : Sans configuration fiable admissible, l’application DOIT afficher une indisponibilité avec reprise, sans inventer une maintenance, une mise à jour requise ou une autorisation. Une restriction déjà connue reste applicable jusqu’à confirmation fiable de sa levée, même si sa configuration est ancienne. Les accès de secours FR-013 restent identifiables.
- **FR-019** : La maintenance DOIT refuser les nouvelles actions ordinaires mais laisser terminer les opérations courtes déjà acceptées. Les résultats incertains suivent les règles de leur domaine ; un achat confirmé, une suppression acceptée ou une demande F10 reçue ne devient pas annulé. Aucun système général de suspension, d’annulation ou de reprise de tâches n’est ajouté.
- **FR-020** : Activer ou désactiver la maintenance NE DOIT PAS modifier l’état des collectes. Pause, cycle commencé, reprise et échéances manquées restent régis par F01. Les traitements internes ne sont pas arrêtés implicitement par le seul blocage de l’accès ordinaire.

#### Notifications pendant la maintenance

- **FR-021** : Eligible F07 personal entries MUST continue to be created during maintenance under normal trigger/recipient rules. Blocking consultation does not itself erase entries or cancel an announcement. F07 daily purge and elapsed retention continue during maintenance; reopening neither restores purged content nor renews its age.
- **FR-022** : Pendant la maintenance, aucun nouveau push sportif NE DOIT être envoyé, y compris à un opérateur autorisé à la contourner. Après sa levée, seules les livraisons encore admissibles avant l’échéance initiale de quinze minutes F07 peuvent reprendre, avec réévaluation des suivis, visibilité, compte, entrée, destination et pertinence. La pause ne prolonge pas le délai, ne recrée aucune entrée et ne rattrape pas les avis expirés.
- **FR-023** : Un message déjà remis au fournisseur avant la maintenance NE DOIT PAS être présenté comme rappelable avec certitude. Son ouverture applique les restrictions courantes ; les réussites déjà établies restent conservées selon F07.

#### Versions minimales et stores

- **FR-024** : Chaque plateforme, iOS et Android, DOIT disposer de son seuil minimal indépendant et de son lien store ; le message de mise à jour reste commun. Une version inférieure est bloquée, une version égale ou supérieure satisfait cette condition. L’absence de seuil signifie qu’aucun minimum n’est imposé par ce réglage pour cette plateforme.
- **FR-025** : La comparaison DOIT suivre l’ordre numérique des composantes de version publiée, et non l’ordre alphabétique du texte ; notamment 2.10.0 est supérieur à 2.9.0. Un seuil invalide DOIT être refusé sans changer l’état accepté. Lorsqu’un seuil doit être appliqué, une version installée inconnue ou invalide ne reçoit pas de valeur fictive ni de décision de compatibilité inventée ; proposer une erreur compréhensible, reprise et assistance. Sans seuil pour la plateforme, aucune comparaison n’est nécessaire.
- **FR-026** : Aucun opérateur, propriétaire compris, NE DOIT contourner le minimum de version. La vérification des réglages suit FR-015–FR-018 ; la compatibilité technique des anciens clients n’est pas déduite de ce contrôle mobile et reste à qualifier sous F14.
- **FR-027** : Lorsque maintenance et mise à jour requise coexistent, la maintenance DOIT être présentée en premier. Sa levée ou son contournement autorisé DOIT laisser applicable le blocage de version restant ; aucune exception de maintenance ne vaut mise à jour installée.
- **FR-028** : Avant de relever un minimum, l’opérateur DOIT disposer d’un lien valide vers le store de la plateforme concernée et vérifier que la version requise est effectivement disponible. Le format d’une URL ne prouve pas la disponibilité du téléchargement ; aucune surveillance automatique des stores n’est ajoutée.
- **FR-029** : Un lien impossible à ouvrir ou un store indisponible DOIT produire un résultat compréhensible avec reprise et assistance, sans lever le minimum. Ouvrir le store ne prouve pas une installation ; l’application DOIT vérifier la version effectivement installée lorsqu’elle réévalue cette condition.
- **FR-030** : Un opérateur autorisé DOIT pouvoir corriger explicitement le seuil, le message ou le lien et retirer un seuil sans modifier la maintenance. Une configuration qui impose un seuil doit disposer d’un lien valide pour cette plateforme ; retirer le lien en conservant ce seuil est refusé. Un message facultatif absent utilise un texte compréhensible sans inventer de délai ou de disponibilité vérifiée.

#### Récupération et frontières

- **FR-031** : Le contenu de repli DOIT distinguer maintenance connue, version trop ancienne et configuration indisponible ; il NE DOIT promettre ni date de réouverture ni durée non établie. L’image n’est jamais le seul support de l’information ou des actions.
- **FR-032** : Le propriétaire DOIT disposer d’un circuit d’exploitation hors de l’application mobile pour corriger des réglages bloquant accidentellement les opérateurs. Ce circuit est réservé au propriétaire ; il ne crée ni exception de version dans l’application ni nouvelle console imposée.
- **FR-033** : La procédure de secours DOIT préciser autorisation, préconditions, réglages concernés, données à préserver, correction, vérification du résultat et conduite à tenir en cas d’échec. Une commande exécutée ne prouve pas le rétablissement ; aucun outil ou mécanisme technique n’est choisi ici.
- **FR-034** : F13 DOIT gouverner sécurité, diagnostics sûrs, accessibilité, français, états dégradés et mesure de disponibilité. La maintenance reste comptée dans l’indisponibilité ; aucun journal personnel, système d’audit supplémentaire ou garantie d’astreinte n’est ajouté.
- **FR-035** : F14 DOIT reprendre les contraintes de version, de compatibilité, de récupération hors application et de maintien des accès utiles lors de la transition. F12 NE DOIT PAS assimiler un écran de maintenance à un retrait de V1 ni autoriser une migration ou un changement de fournisseur. F14 conditionne le retrait ordinaire de V1 à la disponibilité effective de V2 sur les deux stores ; après ouverture, la récupération exigée porte sur V2. L’accueil de transition ne contourne aucune restriction F12.
- **FR-036** : R02 DOIT couvrir globalement les permissions visibles, préparation du contenu, activation/désactivation, refus, conflits, maintenance, mise à jour, configuration indisponible et accès opérateur. Aucun écran n’est déclaré approuvé ; R01/R02 et l’acceptation globale sous #247 précèdent les plans techniques.

### Entités fonctionnelles

- **Permission ordinaire ou privilégiée** : capacité liée à une action et aux conditions du domaine ; son attribution ne vaut pas éligibilité à toute opération.
- **Réglages de maintenance** : état actif/inactif, message et image facultative, modifiables indépendamment des versions.
- **Réglages de version** : seuil et lien store par plateforme, message commun ; absence de seuil distincte d’un seuil invalide.
- **Dernière configuration fiable** : valeurs vérifiées et instant de cette vérification ; le recours au cache ne la renouvelle pas.
- **Exception de maintenance** : choix personnel d’un opérateur actuellement autorisé, sans exception de version ni privilège supplémentaire.
- **Résultat d’enregistrement** : état confirmé, refus, échec ou incertitude, à confronter aux modifications plus récentes.

## Critères de réussite

- **SC-001** : A01–A05 donnent zéro privilège automatique, zéro attribution privilégiée par un autre acteur que le propriétaire et zéro commande acceptée sans ses permissions ; les capacités ordinaires restent soumises à leurs conditions.
- **SC-002** : A06–A12 donnent zéro activation due au seul enregistrement du contenu, zéro modification involontaire d’un autre groupe et zéro écrasement silencieux de saisie ou décision plus récente ; les résultats incertains restent vérifiables.
- **SC-003** : A13–A20 donnent zéro contournement ordinaire d’un refus serveur et zéro droit nouveau issu d’une configuration absente ; le secours est admissible à cinq minutes et inadmissible au-delà. Aucun retour au premier plan, minuteur ou interrogation périodique mobile ne déclenche le contrôle d’accès décrit ici.
- **SC-004** : A21–A22 conservent les résultats des opérations acceptées et l’état des collectes ; zéro reprise de collecte, échéance rattrapée ou annulation supposée découle du seul changement de maintenance.
- **SC-005** : A23–A26 produisent zéro nouvel envoi de push sportif pendant la maintenance, zéro prolongation de l’échéance de quinze minutes et zéro entrée recréée par la levée ; les messages déjà remis gardent leurs limites système.
- **SC-006** : A27–A34 distinguent correctement plateforme, versions inférieure/égale/supérieure, valeur invalide et seuil absent ; zéro contournement opérateur ou levée du minimum due au seul échec d’un store. La correction hors application reste réservée au propriétaire et vérifiée.
- **SC-007** : A35 couvre les règles F13, les contraintes F14 et les besoins R02 sans déclarer une implémentation, une procédure qualifiée ou un écran approuvé. Les contrôles et preuves de qualification futurs restent attribués à leurs phases.

## Hypothèses et limites

- Les actions ordinaires sont les consultations et mutations prévues par F03–F10, sauf les accès explicitement conservés. Les opérateurs restent soumis aux permissions de chaque domaine ; une connexion nécessaire à leur identification n’ouvre pas un accès ordinaire pendant la maintenance.
- Le contrôle mobile unique au démarrage et les autorisations serveur sont des responsabilités distinctes. La manière de fournir au serveur l’état courant, de conserver le dernier état fiable ou de représenter les permissions appartient au plan technique ; aucun polling mobile ne doit être déduit de ces besoins.
- Les versions comparées sont des versions publiées avec composantes numériques ordonnées ; les numéros internes de build, suffixes de préversion et mécanismes d’actualisation à distance ne créent pas de nouvelle politique produit. Leur traduction et la compatibilité des anciens clients seront qualifiées aux phases techniques et de transition.
- Une opération courte déjà acceptée termine sous ses règles existantes. Les processus externes et obligations déjà engagés d’identité ou de paiement ne sont pas annulés par la maintenance. Aucun ordonnanceur général de suspension/reprise n’est prescrit.
- The F07 inbox can receive entries while ordinary access is blocked. Reopening preserves still-retained history and consumed announcement limits; it never resets retention or restores purged entries.
- L’activation est volontaire et le contenu de maintenance ne fournit aucun horaire automatique de fin. Aucun calendrier de maintenance, SLA supplémentaire, console générique ou mécanisme technique de secours n’est sélectionné.
- La procédure de secours et la disponibilité de la version sur le store devront être effectivement vérifiées avant exploitation ; cette spec ne prouve pas leur qualification. R01/R02 et l’acceptation globale sous #247 précèdent la planification technique.

## Éléments probants V1

| Source                                                                                                                                                                                                                                                                                             | Observation et limite                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Navigation racine](../../apps/frontend/mobile/src/modules/session/navigation/root-navigation-state.ts) et [état d’accès](../../apps/frontend/mobile/src/modules/app-status/hooks/use-app-access-state.ts)                                                                                         | Maintenance prioritaire sur mise à jour ; contournements mobiles associés à `update:maintenance`. Ces gardes ne prouvent pas un blocage serveur ni la séparation des permissions V2.                                                       |
| [Contrôle maintenance](../../apps/frontend/mobile/src/modules/administration/hooks/use-maintenance-control.ts) et [carte](../../apps/frontend/mobile/src/modules/administration/ui/maintenance-control-card.tsx)                                                                                   | L’enregistrement envoie un état actif et exige un message ; image facultative et activation confirmée. Ce comportement ne constitue pas la préparation indépendante retenue pour V2.                                                       |
| [Contrôle des versions](../../apps/frontend/mobile/src/modules/administration/hooks/use-app-version-control.ts), [comparaison](../../apps/frontend/mobile/src/modules/app-status/model/app-version.ts) et [écran](../../apps/frontend/mobile/src/modules/app-status/ui/update-required-screen.tsx) | Seuils/liens séparés par plateforme et message commun ; valeur de version de repli, parsing permissif et erreurs d’ouverture absorbées. Aucune preuve de publication au store ni des exigences V2 sur versions inconnues n’en est déduite. |
| [Service de configuration](../../apps/backend/config-service/src/main/java/com/blockout/config/appstatus/application/AppStatusApplicationService.java) et [contrôleur](../../apps/backend/config-service/src/main/java/com/blockout/config/appstatus/api/AppStatusController.java)                 | Mise à jour partielle avec permission commune `update:maintenance` ; valeurs nulles ignorées. Le retrait explicite des champs et la séparation des pouvoirs V2 doivent être définis indépendamment de ce contrat historique.               |
| [Attribution de rôle](../../apps/backend/users-service/src/main/java/com/blockout/users/user/application/UserApplicationService.java) et [architecture V1](../../docs/architecture/mobile-and-identity-architecture-v1.md)                                                                         | Capacité d’attribution du rôle de base ; sa composition effective externe n’a pas été inspectée. Ces mécanismes ne sélectionnent pas l’autorité technique des permissions V2.                                                              |
| [Tests d’accès](../../apps/frontend/mobile/src/modules/app-status/hooks/__tests__/use-app-access-state.test.ts), [tests des écrans](../../apps/frontend/mobile/src/modules/app-status/ui/__tests__/app-status-screens.test.tsx), [inventaire V1](../../docs/product/v1-functional-inventory.md)    | Preuves de parcours locaux V1-20, pas qualification du blocage effectif, de la procédure de secours ou des stores en production.                                                                                                           |

## Couverture et dépendances

| Domaine                                              | Exigences     | Scénarios         | Critères |
| ---------------------------------------------------- | ------------- | ----------------- | -------- |
| V1-20 et permissions communes                        | FR-001–FR-005 | A01–A05, A16      | SC-001   |
| Préparation, retrait de champs et enregistrement     | FR-006–FR-011 | A06–A12           | SC-002   |
| Maintenance, exceptions et vérification au lancement | FR-012–FR-018 | A13–A20           | SC-003   |
| Actions acceptées et collecte indépendante           | FR-019–FR-020 | A21–A22           | SC-004   |
| Entrées personnelles et push                         | FR-021–FR-023 | A23–A26           | SC-005   |
| Versions, stores et circuit de secours               | FR-024–FR-033 | A27–A34, A08, A20 | SC-006   |
| Qualité, transition et conception                    | FR-034–FR-036 | A35               | SC-007   |

| Périmètre                                                                                                                                                               | Propriété et limite                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F01](../001-source-acquisition/spec.md)                                                                                                                                | Collectes, saisons, pauses et relances restent indépendantes de la maintenance d’accès.                                                                                                                           |
| [F02](../002-sporting-data/spec.md), [F03](../007-sporting-consultation/spec.md), [F04](../008-search-discovery/spec.md), [F06](../009-following-personal-feed/spec.md) | Identités, visibilité et actions sportives restent propres aux domaines ; la maintenance n’efface ni ressource ni suivi.                                                                                          |
| [F05](../005-accounts-identity/spec.md), [F08](../010-live-contributions-moderation/spec.md), [F09](../006-pro-subscriptions/spec.md)                                   | Identité et isolation, droits de publication/modération et Pro ; permissions ordinaires automatiques sous conditions, privilèges distincts, pouvoirs F09 réservés au propriétaire.                                |
| [F07](../011-notifications-delivery/spec.md)                                                                                                                            | FR-019, FR-024–FR-026, FR-043–FR-046; A26–A28, A45, A50: inbox creation and retention continue, push delivery pauses without extending 15 minutes, partial successes and announcement facts prevent resurrection. |
| [F10](../012-reports-feature-suggestions/spec.md), [F11](../004-advertising-privacy-legal/spec.md)                                                                      | Assistance, lecture légale et confidentialité malgré le blocage ; l’envoi F10 conserve sa règle de réception complète.                                                                                            |
| [F13](../003-shared-quality/spec.md)                                                                                                                                    | Permissions effectives, disponibilité maintenance comprise, diagnostics et procédure de secours ; aucun seuil global de disponibilité modifié.                                                                    |
| [F14](../014-v1-v2-transition/spec.md) / [#270](https://github.com/blockoutproject/blockout/issues/270)                                                                 | Compatibilité et retrait des anciennes versions, continuité des accès utiles et qualification de la récupération ; aucune transition exécutée ici.                                                                |
| R01 / [#271](https://github.com/blockoutproject/blockout/issues/271), R02 / [#272](https://github.com/blockoutproject/blockout/issues/272)                              | Revue de cohérence puis conception globale des accès et états ; aucun plan technique avant acceptation globale.                                                                                                   |
