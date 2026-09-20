# Spécification fonctionnelle : suivis et calendrier personnel

**Branche de fonctionnalité** : `feature/265-following-personal-feed`

**Créée le** : 2026-09-20

**Statut** : Brouillon

**Périmètre demandé** : [#265](https://github.com/blockoutproject/blockout/issues/265), F06 dans la [carte des spécifications](../../docs/product/specification-perimeters.md). Définir le suivi des équipes et poules, les listes et compteurs associés, ainsi que la sélection des matchs du calendrier personnel. [F02](../002-sporting-data/spec.md) possède les identités et la visibilité, [F03](../007-sporting-consultation/spec.md) les calendriers et [F05](../005-accounts-identity/spec.md) les comptes. Aucun suivi de club, transfert saisonnier automatique, contrat technique ou maquette n’est introduit.

## Scénarios utilisateurs et validation _(obligatoire)_

Les acteurs sont le visiteur et la personne connectée avec un profil utilisable, gratuite ou Pro. Les suivis sont personnels ; le compteur public d’abonnés ne donne pas accès à leur identité. Les scénarios expriment les résultats attendus de la V2, pas une qualification de la V1. Les identifiants FR, A et SC sont locaux à F06.

### Récit utilisateur 1 — Gérer mes suivis avec un résultat fiable (Priorité : P1)

En tant qu’utilisateur, je souhaite gérer mes suivis avec un résultat fiable.

**Justification de la priorité** : Suivre une ressource doit produire une seule relation et un état compréhensible, même après une panne.

**Validation indépendante** : Ajouter et retirer des suivis, répéter les demandes et interrompre leurs réponses.

**Scénarios d’acceptation** :

1. **A01** — **Étant donné** un invité ou une personne dont le profil est temporairement indisponible, **lorsque** une action de suivi est demandée, **alors** l’invité reçoit une proposition de connexion sans suivi implicitement exécuté après connexion ; le profil indisponible suspend l’action personnelle sans fermer la consultation publique. Aucun Pro n’est requis. (FR-001, FR-002)
2. **A02** — **Étant donné** une équipe ou une poule consultable non suivie, **lorsque** un suivi est confirmé, **alors** une seule relation est créée pour le compte courant ; l’état de suivi, la liste applicable et la sélection des matchs reflètent le résultat. Suivre une poule ne suit pas individuellement ses équipes, ni l’inverse. (FR-003, FR-005)
3. **A03** — **Étant donné** une ressource déjà suivie ou un suivi déjà absent, **lorsque** la même demande est répétée, notamment après un double appui, **alors** le résultat reste respectivement suivi ou absent, sans relation ou variation de compteur supplémentaire. Une reprise ne rejoue pas un ancien changement par-dessus un état plus récent. (FR-003, FR-004, FR-023)
4. **A04** — **Étant donné** un suivi accessible existant, **lorsque** son retrait est confirmé, **alors** la relation est retirée sans supprimer la ressource sportive ; la liste et le calendrier sont réévalués, sans retirer les matchs encore sélectionnés par un autre suivi. (FR-004, FR-019)
5. **A05** — **Étant donné** une équipe dont le nom ou la classification est corrigé sans changer son identité, **lorsque** les données sont actualisées, **alors** le suivi est conservé. Une équipe de la nouvelle saison, même de même nom et club, n’est pas suivie automatiquement. (FR-006, FR-007)
6. **A06** — **Étant donné** une mutation en cours pour un compte, **lorsque** la personne change de compte ou se déconnecte avant la réponse, **alors** aucune donnée privée ni réponse tardive du premier compte n’affecte le nouveau contexte ; aucun suivi invité n’est créé. (FR-002, FR-023)

### Récit utilisateur 2 — Choisir une saison commune à mon espace personnel (Priorité : P1)

En tant qu’utilisateur, je souhaite choisir une saison commune à mon espace personnel.

**Justification de la priorité** : Une seule sélection évite que les calendriers et leurs suivis désignent des saisons différentes.

**Validation indépendante** : Changer la saison entre les trois écrans, sélectionner Toutes les saisons et ajouter un suivi d’une autre saison.

**Scénarios d’acceptation** :

1. **A07** — **Étant donné** des suivis consultables de 2025/2026 et 2026/2027, et une saison catalogue 2027/2028, **lorsque** l’espace personnel est ouvert sans choix conservé, **alors** 2026/2027 est sélectionnée. Sans suivi consultable, 2027/2028 est proposée ; sans saison disponible, aucune année n’est inventée. Une erreur de récupération ne prouve pas l’absence de saisons. (FR-009, FR-010, FR-022)
2. **A08** — **Étant donné** plusieurs saisons suivies ou consultables dans le catalogue, **lorsque** une saison est choisie dans À venir, Terminés ou Suivis, **alors** la même sélection s’applique aux trois écrans et aux listes Équipes/Poules ; les filtres de recherche F04 et les fiches clubs F03 ne changent pas. Les choix sont réunis sans doublons ni années fixes. (FR-008, FR-009)
3. **A09** — **Étant donné** des suivis consultables de plusieurs saisons, **lorsque** Toutes les saisons est sélectionné, **alors** leurs listes et matchs admissibles deviennent accessibles ensemble selon leurs règles d’ordre, sans suivi transféré entre saisons. (FR-008, FR-014, FR-018)
4. **A10** — **Étant donné** un filtre sur 2025/2026, **lorsque** une équipe de 2026/2027 est suivie depuis sa fiche, **alors** le suivi est confirmé avec sa saison mais le filtre reste sur 2025/2026 ; la ressource se retrouve en 2026/2027 ou Toutes les saisons. Une nouvelle ouverture sans choix conservé recalcule le défaut. (FR-010, FR-011)
5. **A11** — **Étant donné** une saison valide sélectionnée, **lorsque** une fiche est ouverte puis quittée, ou une saison plus récente apparaît, **alors** le choix courant et le contexte encore valide sont conservés. Une réinitialisation reprend le défaut parmi les suivis consultables, puis le catalogue à défaut. (FR-010, FR-015)
6. **A12** — **Étant donné** une sélection devenue indisponible, **lorsque** cette indisponibilité est établie, **alors** elle est signalée avec choix alternatif ou réinitialisation, sans remplacement silencieux. Une panne de récupération des choix conserve l’incertitude au lieu de déclarer la sélection disparue. (FR-012, FR-022)

### Récit utilisateur 3 — Retrouver mes suivis sans exposer de ressource masquée (Priorité : P1)

En tant qu’utilisateur, je souhaite retrouver mes suivis sans exposer de ressource masquée.

**Justification de la priorité** : L’historique personnel reste utile tout en respectant les restrictions sportives.

**Validation indépendante** : Parcourir homonymes et anciennes saisons, masquer puis rétablir une ressource suivie.

**Scénarios d’acceptation** :

1. **A13** — **Étant donné** des équipes et poules suivies consultables, dont des homonymes, **lorsque** les listes sont parcourues, **alors** chaque onglet applique le filtre commun et l’ordre alphabétique du nom public, avec départage stable et contexte connu de saison/classification. Tous les suivis correspondants restent accessibles, sans plafond total silencieux. (FR-013, FR-014)
2. **A14** — **Étant donné** une ressource suivie qui devient masquée selon F02, **lorsque** les listes, calendriers et anciens accès sont consultés, **alors** aucune carte, section indisponible, ancien nom ou entrée générique n’expose ce suivi masqué ; la fiche suit l’indisponibilité F03 et aucun contrôle de retrait n’est proposé dans l’interface pendant le masquage. La relation reste conservée. (FR-016)
3. **A15** — **Étant donné** une relation conservée vers une ressource masquée, **lorsque** la même identité redevient consultable, **alors** son suivi et ses effets admissibles réapparaissent sans nouvel ajout ni double incrément ; une restriction indépendante subsistante empêche cette réapparition. (FR-006, FR-016, FR-020)
4. **A16** — **Étant donné** des suivis uniquement masqués pour une saison, sans autre donnée consultable de cette saison, **lorsque** les choix et listes sont présentés, **alors** cette saison n’est pas ajoutée au sélecteur par ces seuls suivis. Si le catalogue la justifie indépendamment, elle peut rester proposée. Les états vides parlent de suivis disponibles pour la sélection, sans prétendre effacer les relations conservées. (FR-009, FR-016, FR-017)
5. **A17** — **Étant donné** une saison catalogue sans suivi personnel ou des suivis sans match admissible, **lorsque** le calendrier est consulté, **alors** le premier cas explique l’absence de suivi disponible pour la sélection et propose la recherche ; le second explique l’absence de match applicable. Aucun calendrier général n’est présenté comme personnel. (FR-017, FR-018, FR-022)

### Récit utilisateur 4 — Voir une seule fois chaque match pertinent (Priorité : P1)

En tant qu’utilisateur, je souhaite voir une seule fois chaque match pertinent.

**Justification de la priorité** : Plusieurs suivis peuvent désigner le même match sans multiplier les rencontres du fil.

**Validation indépendante** : Combiner suivis de participants et de poules, puis les retirer successivement et traverser les cas temporels F03.

**Scénarios d’acceptation** :

1. **A18** — **Étant donné** les deux équipes d’un match et sa poule suivies, **lorsque** le fil est consulté, **alors** le match consultable apparaît une seule fois. Une équipe suivie sélectionne ses rencontres dans ses participations consultables ; une poule suivie sélectionne ses rencontres consultables. (FR-018, FR-019)
2. **A19** — **Étant donné** plusieurs suivis sélectionnant un match, **lorsque** l’un puis le dernier de ces suivis sont retirés, **alors** le match reste présent tant qu’un suivi applicable le sélectionne ; il disparaît du fil personnel après retrait du dernier, sans suppression sportive du match. (FR-004, FR-019)
3. **A20** — **Étant donné** un match daté sans résultat, un report, un match sans heure et un match sans date, **lorsque** le calendrier personnel est parcouru à Paris et New York, **alors** les jours/heures, catégories À venir/Terminés, indication de résultat indisponible, bornes communes et masquage sans date suivent F03. Le filtre porte sur la saison sportive F02, pas l’année civile locale. (FR-018, FR-021)
4. **A21** — **Étant donné** un calendrier avec plusieurs pages et un changement de suivi ou de saison, **lorsque** les réponses arrivent dans le désordre ou une page supplémentaire échoue, **alors** les anciens lots ne sont pas ajoutés au nouveau contexte ; les matchs déjà obtenus encore autorisés restent accessibles avec reprise, sans doublon ni fausse fin de liste. (FR-019, FR-022, FR-023)

### Récit utilisateur 5 — Comprendre les compteurs et reprendre après une erreur (Priorité : P1)

En tant qu’utilisateur, je souhaite comprendre les compteurs et reprendre après une erreur.

**Justification de la priorité** : Une interface réactive ne doit pas annoncer un état définitif sans preuve du résultat.

**Validation indépendante** : Simuler échecs confirmés, réponses perdues et panne après succès, puis contrôler compteurs et règles communes.

**Scénarios d’acceptation** :

1. **A22** — **Étant donné** un compteur public connu ou indisponible, **lorsque** un suivi est confirmé, répété, masqué puis rétabli, **alors** une relation compte une fois ; sa répétition ou son masquage ne crée ni ne retire une relation. Un compteur inconnu n’est pas zéro et le nombre de résultats filtrés ne devient pas le compteur d’abonnés. (FR-020)
2. **A23** — **Étant donné** une demande refusée de façon certaine, **lorsque** son résultat est présenté, **alors** l’état confirmé antérieur reste applicable, avec erreur et possibilité de reprise appropriée, sans succès ou compteur inventé. Une cible devenue masquée ne peut pas être suivie par un ancien accès. (FR-001, FR-024)
3. **A24** — **Étant donné** un ajout ou retrait potentiellement enregistré dont la réponse est perdue, **lorsque** l’interface reçoit une erreur de transport, **alors** elle indique une vérification ou incertitude et retrouve l’état par contrôle ou reprise sûre, sans supposer un échec certain ni produire un doublon. (FR-024, FR-025)
4. **A25** — **Étant donné** une mutation acceptée suivie d’un échec de récupération du profil, **lorsque** la présentation est réconciliée, **alors** l’échec de lecture ne prouve pas l’annulation de la mutation. Un état provisoire ne devient pas une fausse confirmation ; le résultat est vérifié sans effacer arbitrairement le succès acquis. (FR-025)
5. **A26** — **Étant donné** des suivis récupérés mais certaines ressources ou certains matchs en échec, **lorsque** les parcours sont consultés ou actualisés, **alors** les données disponibles et autorisées restent utilisables, avec fraîcheur et limites identifiables ; chaque panne reste distincte de zéro suivi, zéro ressource ou zéro match. Les attentes sont bornées et une reprise est possible. (FR-022, FR-026)
6. **A27** — **Étant donné** un suivi confirmé puis retiré, **lorsque** la relation est consommée par les fonctions de notification, **alors** F07 reçoit le sens du changement sans relation dupliquée ni ancien état réimposé. Le filtre de saison du fil ne devient pas une préférence de notification ; aucune permission système ni livraison n’est promise par le suivi seul. (FR-023, FR-027)
7. **A28** — **Étant donné** un utilisateur gratuit, Pro ou aux droits inconnus, **lorsque** les suivis et calendriers personnels sont utilisés avec les moyens d’accessibilité applicables, **alors** les règles F05/F09/F11/F13 s’appliquent : pas de paiement requis pour suivre, pas d’interstitiel sur filtre/actualisation/retour, navigation sportive selon F11, états lisibles sans couleur seule, confidentialité des relations et signalement contextualisé. (FR-026, FR-028)

### Cas limites

- Une saison terminée reste consultable selon F02 ; une nouvelle saison ne remplace pas les identités suivies.
- Tous les suivis peuvent être conservés mais masqués : aucune liste d’indisponibles n’est exposée et l’interface ne prétend pas que les relations ont été supprimées.
- Retirer le dernier suivi de la saison sélectionnée ne change pas silencieusement de saison : elle reste sélectionnable si le catalogue la justifie ; sinon FR-012 s’applique.
- Un suivi d’une autre saison est enregistré sans changement du filtre courant ; le filtre n’est ni une mutation de suivi ni une préférence de notification.
- Une absence de réponse, un refus établi et un échec de lecture après succès sont trois situations distinctes.

## Exigences _(obligatoire)_

### Exigences fonctionnelles

#### Accès, relations et renouvellement

- **FR-001** : Le suivi DOIT concerner uniquement les équipes et poules consultables, pour une personne connectée avec un profil utilisable, sans Pro requis. Une cible inexistante ou masquée NE DOIT PAS recevoir un nouveau suivi par un ancien accès. Aucun droit d’édition ou suivi de club n’est ajouté.
- **FR-002** : Un invité DOIT recevoir la proposition de connexion F05 sans suivi exécuté implicitement après celle-ci. Un profil indisponible suspend les actions personnelles sans bloquer le contenu public. Les suivis et réponses DOIVENT rester isolés par compte ; déconnexion, changement et suppression suivent F05.
- **FR-003** : L’ajout confirmé DOIT créer une seule relation compte/type/identité. Répéter un ajout déjà satisfait NE DOIT PAS créer de doublon ni répéter ses effets sur les compteurs. Les demandes concurrentes ou reprises DOIVENT respecter cette unicité.
- **FR-004** : Le retrait confirmé d’un suivi accessible DOIT supprimer cette relation personnelle, sans supprimer la ressource sportive. Retirer une relation déjà absente NE DOIT PAS répéter les effets sur les compteurs. L’état, la liste et la sélection des matchs DOIVENT être réévalués après confirmation.
- **FR-005** : Suivre une poule NE DOIT PAS créer de suivis individuels de ses équipes ; suivre une équipe NE DOIT PAS créer de suivis de ses poules. Chaque relation conserve son sens et peut sélectionner les matchs pertinents indépendamment des autres.
- **FR-006** : Un suivi DOIT rester attaché à l’identité F02, y compris lors d’une correction de nom/classification qui la conserve et d’une réapparition autorisée. Aucune ressemblance de nom, club ou classification ne transfère la relation vers une autre identité.
- **FR-007** : Le renouvellement saisonnier des suivis DOIT rester manuel. Une nouvelle équipe ou poule saisonnière n’hérite pas des suivis anciens ; les ressources historiques encore consultables restent accessibles. La reprise exceptionnelle V1 appartient à F14.

#### Saison commune et navigation

- **FR-008** : À venir, Terminés et Suivis DOIVENT partager une seule sélection de saison, commune aussi aux listes Équipes et Poules. « Toutes les saisons » DOIT être proposé. Ce filtre est indépendant de la recherche F04 et des fiches clubs F03.
- **FR-009** : Les saisons proposées DOIVENT réunir celles des suivis consultables et du catalogue consultable, sans doublon ni années fixes. Une saison uniquement justifiée par des suivis masqués NE DOIT PAS être exposée par ces relations ; elle reste possible si le catalogue la justifie indépendamment. Aucune année n’est inventée sans donnée disponible.
- **FR-010** : Sans choix conservé, la saison la plus récente des suivis consultables DOIT être sélectionnée ; à défaut, la plus récente du catalogue. Une sélection valide DOIT persister pendant le parcours, même si une saison plus récente apparaît. Réinitialiser réapplique cette règle ; une nouvelle ouverture sans choix conservé recalcule le défaut.
- **FR-011** : Ajouter un suivi d’une autre saison NE DOIT PAS modifier le filtre commun courant. La confirmation DOIT identifier la saison du suivi, retrouvable dans cette saison ou Toutes les saisons. Cette règle ne transfère pas le suivi et n’efface pas les choix de navigation.
- **FR-012** : Une sélection devenue indisponible DOIT être signalée avec possibilité de correction ou réinitialisation, sans remplacement silencieux. Une erreur de chargement des choix NE DOIT PAS être traitée comme leur disparition.

#### Listes personnelles et masquage

- **FR-013** : Les listes Équipes et Poules DOIVENT appliquer le filtre commun et trier les suivis consultables par nom public alphabétique, avec départage stable des homonymes pour des données inchangées. Saison, classification et autres repères disponibles DOIVENT permettre de distinguer les ressources sans détail inventé.
- **FR-014** : Tous les suivis consultables correspondant à la sélection DOIVENT être accessibles, sans plafond total silencieux. Une identité apparaît une seule fois dans sa liste. Toutes les saisons réunit les suivis historiques admissibles sans modifier leurs identités.
- **FR-015** : L’ouverture d’une ressource DOIT utiliser sa fiche F03. Le retour DOIT conserver la sélection, l’onglet et la position lorsque le contexte reste valide ; une modification d’ordre ou de visibilité peut nécessiter une recomposition sans garantir la position exacte.
- **FR-016** : Une ressource masquée selon F02 DOIT disparaître des listes et de ses effets non autorisés sur le fil, même suivie. Aucune section d’indisponibles, ancien nom, carte générique ou contrôle de retrait de ce suivi NE DOIT être exposé pendant le masquage. La relation reste conservée pour une réapparition de la même identité, sans nouvel ajout ; aucun autre motif de restriction n’est levé. Un ancien lien suit l’indisponibilité F03.
- **FR-017** : Les états vides DOIVENT distinguer aucun suivi disponible pour la sélection et aucun match applicable malgré des suivis disponibles. Ils NE DOIVENT PAS affirmer la suppression de relations masquées. Une saison sans suivi disponible DOIT proposer l’accès à la recherche pour choisir des suivis manuellement.

#### Calendrier personnel et compteurs

- **FR-018** : Le fil DOIT sélectionner les matchs consultables de la saison sportive choisie liés à au moins une équipe ou une poule suivie applicable. Une équipe sélectionne ses rencontres dans ses participations consultables ; une poule sélectionne ses rencontres consultables. Toutes les saisons enlève uniquement la restriction saisonnière. Sans suivi applicable, aucun calendrier général de substitution n’est présenté comme personnel.
- **FR-019** : Un match sélectionné par plusieurs suivis DOIT apparaître une seule fois. Retirer un suivi NE DOIT PAS le retirer si un autre le sélectionne encore ; le retrait du dernier le retire du fil sans mutation sportive. Pagination et actualisation DOIVENT éviter doublons et omissions durables conformément à F03.
- **FR-020** : Le compteur public d’abonnés DOIT représenter les relations de suivi existantes pour cette identité, chacune une seule fois, sans exposer les personnes abonnées. Filtre de saison, masquage et réapparition ne créent ni ne suppriment une relation. Un compteur inconnu NE DOIT PAS être présenté comme zéro ; une quantité de suivis affichés ne devient pas le compteur d’abonnés ni un total exhaustif implicite.
- **FR-021** : Les calendriers personnels DOIVENT réutiliser F03 pour horaires et jours locaux, ordre, bornes communes, absence de résultat, reports, dates inconnues et navigation. Un match passé sans résultat relève du traitement F03, pas d’une exclusion propre au fil. La saison provient de F02, jamais de l’année civile d’affichage.

#### Erreurs, concurrence et responsabilités communes

- **FR-022** : Chargement des relations, récupération des ressources et chargement des matchs DOIVENT rester distingués. Une panne à une étape NE DOIT PAS produire zéro suivi ou zéro match. Les données encore autorisées restent utilisables avec leurs limites et leur fraîcheur ; les attentes sont bornées et les erreurs initiales, d’actualisation ou de page supplémentaire proposent une reprise, sans fausse fin de liste.
- **FR-023** : Les demandes et réponses DOIVENT être rattachées au compte, à la cible et au contexte applicables. Une réponse obsolète NE DOIT PAS remplacer une sélection actuelle ni ajouter un ancien lot au nouveau fil. Les répétitions de mutations ou événements NE DOIVENT PAS réimposer un état antérieur après un changement plus récent confirmé.
- **FR-024** : Un succès confirmé DOIT être distingué d’un échec confirmé et d’un résultat incertain. Un refus certain conserve l’état confirmé applicable et explique l’échec. Une réponse perdue DOIT conduire à une vérification ou reprise sûre, sans supposer qu’aucun changement n’a été enregistré.
- **FR-025** : Un échec de récupération du profil après mutation NE DOIT PAS suffire à annoncer son annulation. Une présentation anticipée DOIT rester identifiable comme provisoire jusqu’à confirmation ; la réconciliation retrouve le résultat sans relation, compteur ou succès inventé.
- **FR-026** : Les exigences F13 de performance, fraîcheur, disponibilité, accessibilité, isolation des pannes et diagnostics DOIVENT s’appliquer sans nouveau seuil local. Les états de suivi, sélections et reprises DOIVENT être compréhensibles sans dépendre uniquement de la couleur. Les restrictions connues priment sur la conservation des données précédentes.
- **FR-027** : Les relations confirmées et leurs changements DOIVENT constituer la référence de suivi consommable par F07 sans doublon ni retour à un ancien état. F07 possède éligibilité et livraison des notifications ; suivre seul ne prouve ni permission système ni livraison. La saison d’affichage NE DOIT PAS devenir implicitement une préférence de notification.
- **FR-028** : F05/F09/F11 DOIVENT gouverner comptes, droits, publicité et confidentialité. Les suivis et le calendrier personnel ne deviennent pas payants. Filtres, actualisations et retours ne déclenchent pas d’interstitiel ; la navigation sportive suit F11. Les relations personnelles ne sont pas exposées à d’autres utilisateurs. Le signalement conserve son contexte et les limites F10/F11, sans nouvelle collecte implicite.

### Entités clés

- **Relation de suivi** : Lien personnel entre un compte et une identité d’équipe ou de poule, conservé indépendamment de sa visibilité et sans transfert saisonnier implicite.
- **Sélection personnelle** : Saison unique ou Toutes les saisons, partagée par les calendriers et les deux listes de suivis, distincte des filtres F03/F04.
- **Suivi consultable** : Relation dont la cible est actuellement consultable selon F02 ; sa visibilité ne définit pas l’existence de la relation.
- **Match du fil** : Match F02 consultable et sélectionné par au moins une relation applicable, présenté selon F03 et dédupliqué par identité.
- **Compteur d’abonnés** : Nombre de relations existantes sur une ressource ; il ne désigne ni les éléments chargés d’une liste ni une liste publique d’utilisateurs.
- **Résultat de mutation** : Succès confirmé, échec confirmé ou incertitude nécessitant vérification ; une présentation anticipée ne constitue pas une preuve d’enregistrement.

## Critères de réussite _(obligatoire)_

### Résultats mesurables

- **SC-001** : A01–A06 produisent au maximum une relation par compte/type/identité, aucun suivi invité ou implicite et aucune fuite entre comptes. Les répétitions produisent zéro effet supplémentaire. (FR-001–FR-007, FR-023)
- **SC-002** : A07–A12 appliquent une sélection identique aux trois écrans et aux deux listes, sans modifier les filtres externes ni remplacer silencieusement un choix valide. (FR-008–FR-012, FR-015)
- **SC-003** : A13–A17 rendent tous les suivis consultables correspondants accessibles, avec zéro entrée révélant un suivi masqué et zéro transfert de relation lors de sa réapparition. (FR-013–FR-017)
- **SC-004** : A18–A21 présentent chaque match admissible une seule fois et conservent un match tant qu’un suivi le sélectionne ; tous les cas temporels utilisent F03. (FR-018–FR-019, FR-021–FR-023)
- **SC-005** : A22–A26 produisent zéro variation répétée de compteur, zéro incertitude présentée comme un échec certain et zéro panne présentée comme une liste vide établie. (FR-020, FR-022–FR-026)
- **SC-006** : A27–A28 respectent les frontières F05/F07/F09/F10/F11/F13, sans préférence de notification déduite du filtre, suivi payant ou nouvelle collecte. Les parcours satisfont les objectifs communs F13 lors de leur qualification. (FR-027–FR-028)

## Hypothèses

- La sélection commune s’applique uniquement à l’espace personnel. Sa persistance entre deux lancements n’est pas exigée ; tant qu’un choix valide est conservé, il prime sur le calcul du défaut.
- L’absence de retrait d’un suivi masqué dans l’interface est intentionnelle. Elle ne bloque pas l’effacement des données personnelles lors d’une suppression de compte F05 ; une relation supprimée ne renaît pas lors d’une réapparition sportive.
- La recherche F04 reste le point d’entrée pour choisir manuellement les ressources d’une autre saison. Aucun assistant de transfert ou bouton de renouvellement automatique n’est ajouté.
- Une présentation anticipée est possible mais non imposée ; son état provisoire et la réconciliation sont obligatoires. Aucun mécanisme de concurrence, transport, stockage ou reconstruction de compteur n’est choisi ici.
- Les relations de suivi restent la référence du compteur. Les états d’affichage ne sont pas des opérations de suppression ; les effets de la suppression de compte suivent F05.
- Les dates limites de collecte ou de saison ne déterminent pas seules la consultabilité. F02 possède celle-ci ; F03 possède les catégories et règles calendaires, notamment le traitement des matchs passés sans résultat.
- Cette livraison est fonctionnelle. R01/R02 et l’acceptation globale sous #247 précèdent tout plan technique, tâche ou réalisation.

## Éléments probants et traçabilité

### Sources V1

Ces observations décrivent le dépôt local et ne constituent ni une mesure de production ni une preuve de conformité V2.

| Source                                                                                                                                                                                                                                            | Observation et limite                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Inventaire V1](../../docs/product/v1-functional-inventory.md), V1-11/V1-10                                                                                                                                                                       | Suivis d’équipes/poules, renouvellement manuel et sélection personnelle conservés. Le traitement des matchs passés sans résultat suit désormais l’intention F03.                                                                                              |
| [Service de favoris](../../apps/backend/users-service/src/main/java/com/blockout/users/user/application/UserFavoriteApplicationService.java)                                                                                                      | Vérification d’existence avant ajout, retrait sans effet si absent, mises à jour de compteurs et publication de changements. Ces chemins ne prouvent pas à eux seuls la cohérence face aux reprises ou pannes distribuées.                                    |
| [Mutation mobile](../../apps/frontend/mobile/src/modules/user/hooks/use-follow-state.ts)                                                                                                                                                          | Mise à jour anticipée puis récupération du profil dans la même opération, avec restauration lors d’une erreur. Un échec de lecture peut donc être traité comme un échec global ; FR-024/FR-025 exige de distinguer le résultat enregistré de sa récupération. |
| [Liste des suivis](../../apps/frontend/mobile/src/modules/followed/ui/followed-screen.tsx)                                                                                                                                                        | Sélections saisonnières distinctes pour équipes/poules et défaut dérivé des ressources récupérées. F06 définit une seule sélection commune incluant le calendrier, sans imposer cette structure V1.                                                           |
| [Équipes suivies](../../apps/frontend/mobile/src/modules/team/hooks/use-followed-team-list.ts), [liste](../../apps/frontend/mobile/src/modules/followed/ui/followed-teams-list.tsx)                                                               | Récupération par identités, saisons dérivées et états mobiles ; les données absentes ou en erreur ne prouvent pas une suppression des relations.                                                                                                              |
| [Fil personnel](../../apps/frontend/mobile/src/modules/feed/ui/feed-screen.tsx), [sélection des matchs](../../apps/backend/matches-service/src/main/java/com/blockout/matches/match/infrastructure/persistence/repositories/MatchRepository.java) | Sélection par équipes ou poules suivies et calendriers À venir/Terminés. Les catégories, limites temporelles et règles d’affichage V2 restent celles de F03, pas celles des requêtes V1.                                                                      |
| [Compteur](../../apps/frontend/mobile/src/shared/ui/follow/followers-count.tsx), [mise à jour distante](../../apps/backend/users-service/src/main/java/com/blockout/users/user/infrastructure/http/HttpFollowerCounter.java)                      | Compteur public et effets de suivi existants ; F06 définit leur sens sans prescrire les appels ou garanties techniques V1.                                                                                                                                    |
| [Continuité identité/Pro](../../docs/product/identity-and-pro-continuity.md)                                                                                                                                                                      | La suppression volontaire et la reprise V1 ne sont pas un renouvellement saisonnier ; aucune restauration de données personnelles effacées ou nouvelle capacité payante n’est induite.                                                                        |

Les onglets, suivis par identité, compteurs, recherche de nouvelles cibles et signalement sont conservés dans leur périmètre. Le filtre commun, les transitions explicites d’incertitude et les exigences de cohérence sont des résultats V2, pas des corrections de code livrées ici. Les délais de cache, structures de listes et appels interservices V1 restent des détails techniques non reconduits comme obligations.

### Couverture de l’inventaire et des décisions

| Couverture                                                    | Exigences F06         | Scénarios         |
| ------------------------------------------------------------- | --------------------- | ----------------- |
| V1-11 : accès, ajout/retrait, identité et renouvellement      | FR-001–FR-007         | A01–A06           |
| V1-11 / V1-10 : sélection saisonnière commune                 | FR-008–FR-012         | A07–A12           |
| V1-11 / F02 : listes, historique et masquage                  | FR-013–FR-017         | A13–A17           |
| V1-10 / F03 : union, déduplication et présentation des matchs | FR-018–FR-019, FR-021 | A18–A21           |
| V1-11 : compteurs, erreurs, concurrence et reprise            | FR-020, FR-022–FR-025 | A03, A06, A21–A26 |
| F05 / F07 / F09 / F10 / F11 / F13 : responsabilités communes  | FR-026–FR-028         | A26–A28           |

<a id="cross-perimeter-dependencies"></a>

### Dépendances entre périmètres

| Propriétaire                                                                              | Accord avec F06                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F02](../002-sporting-data/spec.md)                                                       | Identité, saison sportive, corrections, retraits et réapparitions. F06 conserve les relations sans exposer les cibles masquées ni transférer les suivis.                                                              |
| [F03](../007-sporting-consultation/spec.md)                                               | Fiches, ordre, pagination et temps local ; ses bornes de présentation ne deviennent pas des événements sportifs ou de notification.                                                                                   |
| [F04](../008-search-discovery/spec.md)                                                    | Recherche pour choisir manuellement de nouveaux suivis ; son texte et ses filtres ne sont pas pilotés par la saison personnelle.                                                                                      |
| [F05](../005-accounts-identity/spec.md)                                                   | Connexion, profil prêt, isolation et suppression des relations personnelles ; aucun suivi automatique après connexion.                                                                                                |
| F07                                                                                       | Consomme les relations confirmées ; possède éligibilité, préférences et livraison des notifications. La saison du fil reste un filtre d’affichage.                                                                    |
| [F09](../006-pro-subscriptions/spec.md) / [F11](../004-advertising-privacy-legal/spec.md) | Droits et publicité sans restriction Pro ajoutée aux suivis ou au fil ; confidentialité des listes personnelles.                                                                                                      |
| F10 / [F13](../003-shared-quality/spec.md)                                                | Signalement contextualisé, minimisation, performance, accessibilité, fraîcheur, erreurs et diagnostic. Aucun nouveau seuil F06.                                                                                       |
| F14 / R01 / R02                                                                           | Migration distincte du renouvellement saisonnier, cohérence globale et maquettes. R02 couvre filtre commun, homonymes, états vides, mutation provisoire/incertaine et reprise ; aucun écran n’est déclaré validé ici. |
