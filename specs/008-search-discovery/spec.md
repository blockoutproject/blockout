# Spécification fonctionnelle : recherche et découverte

**Branche de fonctionnalité** : `feature/264-search-discovery`

**Créée le** : 2026-09-19

**Statut** : Brouillon

**Périmètre demandé** : [#264](https://github.com/blockoutproject/blockout/issues/264), F04 dans la [carte des spécifications](../../docs/product/specification-perimeters.md). Définir la découverte et la recherche publiques de clubs, équipes et poules, leurs filtres, saisons, ordre, parcours complet et états de récupération. Les identités et la visibilité restent régies par [F02](../002-sporting-data/spec.md), les destinations par [F03](../007-sporting-consultation/spec.md) et la qualité commune par [F13](../003-shared-quality/spec.md). Aucun autre type de ressource recherchable, moteur, contrat technique ou maquette n’est ajouté.

## Scénarios utilisateurs et validation _(obligatoire)_

Les acteurs sont le visiteur et la personne connectée, avec ou sans Pro. Tous disposent de la recherche publique. F04 ne confère aucune permission d’édition. Les identifiants FR, A et SC sont locaux à cette spécification. Les scénarios décrivent la V2 attendue, sans attester une implémentation ou des essais déjà réalisés.

### Récit utilisateur 1 — Découvrir des ressources sans saisir de texte (Priorité : P1)

En tant que visiteur, je souhaite découvrir des exemples utiles sans compte ni saisie préalable.

**Justification de la priorité** : La découverte donne un point d’entrée sans confondre exemples et catalogue complet.

**Validation indépendante** : Ouvrir chaque onglet, revenir depuis une fiche, modifier un filtre puis réinitialiser la recherche.

**Scénarios d’acceptation** :

1. **A01** — **Étant donné** un visiteur ou une personne gratuite, Pro ou aux droits inconnus, **lorsque** la recherche est ouverte, **alors** les trois onglets Équipes, Poules et Clubs sont accessibles sans connexion ou achat imposé ; les droits inconnus ne bloquent pas la recherche publique. (FR-001, FR-028)
2. **A02** — **Étant donné** un champ vide, y compris composé d’espaces, sans filtre choisi, **lorsque** un onglet est consulté, **alors** une sélection limitée est explicitement présentée comme exemples, sans total ni prétention à l’exhaustivité ; les équipes et poules utilisent la saison la plus récente disponible. (FR-002, FR-006, FR-012)
3. **A03** — **Étant donné** des exemples consultables déjà présentés, **lorsque** une fiche est ouverte puis quittée ou un autre onglet est visité, **alors** les exemples précédents et leur ordre sont conservés pendant la visite ; ils peuvent varier lors d’une nouvelle visite et ne reposent pas sur un profil ou une géolocalisation. Une restriction connue retire la ressource concernée. (FR-003, FR-020)
4. **A04** — **Étant donné** des exemples initiaux, **lorsque** du texte est saisi ou un filtre est explicitement choisi, même la saison déjà proposée ou « Toutes les saisons », **alors** une recherche exhaustive remplace les exemples. Effacer le texte conserve la recherche si un filtre reste explicitement choisi ; réinitialiser le texte et les filtres de cet onglet restaure la découverte. (FR-004, FR-005)

### Récit utilisateur 2 — Retrouver une ressource par ses noms et son contexte (Priorité : P1)

En tant qu’utilisateur, je souhaite retrouver une ressource malgré une variation de saisie, sans confusion entre des identités proches.

**Justification de la priorité** : Une recherche tolérante doit rester fidèle au contexte et aux identités sportives.

**Validation indépendante** : Rechercher des noms, villes, classifications, alias et mots répartis entre champs sur un jeu de ressources connues.

**Scénarios d’acceptation** :

1. **A05** — **Étant donné** un club nommé « Étoile Volley » à Lyon, **lorsque** « etoile », « ÉTOILE » ou « etoile » est recherché, **alors** le club reste retrouvable ; « éto » permet une recherche par début de mot. Les espaces seuls constituent un champ vide. (FR-006, FR-007)
2. **A06** — **Étant donné** des équipes et poules possédant les champs connus prévus par F04, **lorsque** chaque champ est recherché séparément, **alors** nom complet ou court, club, ville du club et division retrouvent les équipes concernées ; nom complet ou court, division et ligue retrouvent les poules concernées. Nom et ville retrouvent les clubs. (FR-006)
3. **A07** — **Étant donné** une équipe « Aigles » rattachée à un club de Lyon et une autre équipe Aigles dans une autre ville, **lorsque** « Aigles Lyon » est recherché, **alors** les termes peuvent correspondre à des champs différents de la même ressource ; le seul mot Aigles ne suffit pas à satisfaire toute la recherche. (FR-008)
4. **A08** — **Étant donné** une correspondance directe pour un texte et une ressource portant un nom voisin, **lorsque** une petite faute de frappe est saisie, par exemple « Volly » pour « Volley », **alors** la correspondance approchante reste retrouvable après les correspondances directes. Une mauvaise saison, division, format ou genre exclut la ressource même si son nom est proche. Aucun résultat sans rapport n’est ajouté pour remplir la liste. (FR-009, FR-011, FR-017)
5. **A09** — **Étant donné** un nom public personnalisé, son nom source actuel et un alias vérifié et délimité par F02, **lorsque** chacun de ces noms est recherché dans son contexte valide, **alors** la même identité est retrouvée une seule fois sous son nom public. Deux homonymes restent deux résultats ; ni la similarité ni la tolérance aux accents ne fusionnent leurs identités. (FR-010, FR-019)
6. **A10** — **Étant donné** une personnalisation ou un alias modifié selon F02, **lorsque** la recherche est consultée ou actualisée après propagation selon F13, **alors** les noms actuels et alias encore applicables sont utilisés, sans historique arbitraire de noms ni alias déduit de la ressemblance. (FR-010, FR-026)

### Récit utilisateur 3 — Choisir mes filtres et conserver mon contexte (Priorité : P1)

En tant qu’utilisateur, je souhaite explorer une saison ou une classification sans perdre mes choix en changeant d’onglet.

**Justification de la priorité** : Les équipes saisonnières doivent rester distinguables et les filtres ne doivent pas changer silencieusement.

**Validation indépendante** : Combiner les quatre filtres, consulter des saisons anciennes et futures, changer d’onglet et rendre une sélection indisponible.

**Scénarios d’acceptation** :

1. **A11** — **Étant donné** plusieurs saisons consultables, dont une future déjà publiée, **lorsque** Équipes ou Poules est ouvert sans sélection conservée, **alors** la saison la plus récente disponible pour ce type de ressource est proposée et identifiée. Les saisons anciennes et « Toutes les saisons » restent sélectionnables ; aucun calendrier d’années fixe ne les limite. (FR-012)
2. **A12** — **Étant donné** des ressources consultables de plusieurs classifications et saisons, **lorsque** saison, division, format et genre sont combinés, avec ou sans texte, **alors** chaque résultat satisfait tous les filtres choisis. Les valeurs non choisies ne restreignent pas les résultats ; une combinaison sans correspondance produit un vrai état vide, sans retirer un filtre automatiquement. (FR-011, FR-013, FR-023)
3. **A13** — **Étant donné** un texte commun, des équipes filtrées sur le féminin et des poules sur le masculin, **lorsque** le parcours Équipes → Poules → Clubs → Équipes est effectué, **alors** le texte reste commun et chaque onglet sportif retrouve ses propres filtres ; Clubs ignore ces filtres sans les effacer. Les filtres actifs sont visibles et réinitialisables. (FR-014, FR-005)
4. **A14** — **Étant donné** un résultat ouvert depuis une liste avancée, **lorsque** la personne revient à la recherche, **alors** onglet, texte, filtres et position sont conservés lorsque le contexte reste valide. Une restriction survenue pendant la consultation prévaut sur cette restauration. (FR-015, FR-020)
5. **A15** — **Étant donné** une saison ou division sélectionnée qui devient indisponible, **lorsque** son indisponibilité est connue, **alors** la sélection concernée est identifiée comme indisponible, avec correction ou réinitialisation possible ; elle n’est ni cachée ni remplacée silencieusement par une sélection plus large. Une panne de chargement des choix ne prouve pas leur disparition. (FR-016, FR-024)
6. **A16** — **Étant donné** une ancienne saison encore consultable ou un club sans équipe visible, **lorsque** une recherche adaptée est effectuée, **alors** la saison terminée reste accessible et le club reste retrouvable ; une équipe sans participation visible est absente conformément à F02. (FR-012, FR-020)

### Récit utilisateur 4 — Parcourir tous les résultats et ouvrir la bonne fiche (Priorité : P1)

En tant qu’utilisateur, je souhaite atteindre toutes les correspondances et identifier la bonne ressource avant de l’ouvrir.

**Justification de la priorité** : Un plafond silencieux empêche de retrouver des ressources existantes.

**Validation indépendante** : Parcourir plus de vingt correspondances, départager des homonymes et ouvrir une cible devenue indisponible.

**Scénarios d’acceptation** :

1. **A17** — **Étant donné** une recherche contenant 47 correspondances consultables sur des données inchangées, **lorsque** les résultats sont parcourus jusqu’au bout, **alors** les 47 identités sont accessibles une seule fois, sans plafond de vingt. Chargement supplémentaire et fin réelle sont distingués ; le nombre chargé n’est jamais présenté comme total. (FR-018, FR-019, FR-022)
2. **A18** — **Étant donné** une recherche filtrée sans texte sur plusieurs saisons, **lorsque** les résultats sont parcourus, **alors** le nom public détermine l’ordre alphabétique ; les saisons récentes ne prennent pas automatiquement priorité. Les homonymes ont un départage stable ; avec du texte, la pertinence prime puis un départage stable s’applique. (FR-017)
3. **A19** — **Étant donné** des homonymes et des ressources partiellement renseignées, **lorsque** leurs résultats sont présentés, **alors** nom public et contexte disponible permettent de les distinguer : ville du club, saison et classification de l’équipe ou poule, club ou ligue lorsqu’utiles. L’absence de logo ou détail secondaire ne fabrique pas de valeur et ne masque pas à elle seule la ressource. (FR-021)
4. **A20** — **Étant donné** une identité sélectionnée qui devient masquée avant l’ouverture, **lorsque** la destination est ouverte, **alors** l’indisponibilité prévue par F03 est expliquée sans redirection vers une autre ressource ressemblante ; une erreur réseau est distinguée d’un masquage établi. (FR-020, FR-027)
5. **A21** — **Étant donné** une poule exclue, une division inactive ou une équipe masquée, puis une réapparition autorisée, **lorsque** la recherche est consultée ou actualisée, **alors** aucun texte, alias, ancienne saison ou résultat conservé ne contourne le masquage connu. Une réapparition réutilise l’identité F02 et ne lève pas les autres restrictions. (FR-020, FR-026)
6. **A22** — **Étant donné** un nom ou une visibilité qui change pendant le parcours, **lorsque** la liste est actualisée, **alors** le contexte applicable est conservé et les résultats recomposés sans doublon ni omission durable ; la position exacte n’est pas garantie si l’ordre a changé. Aucun lot de l’ancien état n’est ajouté à la nouvelle liste. (FR-019, FR-025, FR-026)

### Récit utilisateur 5 — Comprendre les erreurs et reprendre la recherche (Priorité : P1)

En tant qu’utilisateur, je souhaite distinguer une recherche vide d’une panne et reprendre sans perdre les résultats encore utilisables.

**Justification de la priorité** : Une erreur transformée en liste vide donne une fausse information sur le catalogue.

**Validation indépendante** : Provoquer des échecs initiaux, partiels et de reprise, recevoir des réponses tardives et vérifier les règles communes.

**Scénarios d’acceptation** :

1. **A23** — **Étant donné** une recherche réussie complète sans correspondance puis une recherche échouée sans données utilisables, **lorsque** leurs états sont présentés, **alors** la première annonce aucun résultat pour les critères actuels ; la seconde annonce une indisponibilité avec reprise. Aucun chargement n’attend indéfiniment et aucun diagnostic interne n’est exposé. (FR-023, FR-024)
2. **A24** — **Étant donné** des résultats obtenus et encore autorisés, **lorsque** l’actualisation ou le chargement suivant échoue, **alors** les résultats restent consultables avec l’échec et une reprise identifiables ; une fraîcheur incertaine n’est pas annoncée comme actuelle. L’échec suivant ne devient pas une fin de liste. (FR-024, FR-022)
3. **A25** — **Étant donné** une recherche interrompue ou un résultat incomplet, même sans élément retourné, **lorsque** son état est présenté, **alors** le caractère partiel ou indisponible est explicite ; ni un total exhaustif, ni une fin réelle, ni une absence certaine de correspondance ne sont affirmés. (FR-022, FR-023)
4. **A26** — **Étant donné** plusieurs textes, filtres ou onglets successifs, **lorsque** les réponses arrivent dans le désordre, **alors** seule la réponse correspondant au contexte actuel commande la liste ; des données d’une autre recherche ne sont pas présentées comme ses résultats. (FR-025)
5. **A27** — **Étant donné** une nouvelle donnée sportive acceptée ou une correction de nom public, **lorsque** une nouvelle consultation ou actualisation intervient, **alors** la propagation respecte le délai F13, avec distinction entre fraîcheur connue et inconnue ; aucune actualisation continue de l’écran n’est imposée. Les objectifs de consultation F13 s’appliquent aussi à la recherche. (FR-026, FR-030)
6. **A28** — **Étant donné** un invité ou une personne dont les droits évoluent, **lorsque** des filtres sont utilisés puis une fiche est ouverte, **alors** filtres, défilement, actualisation et retour ne déclenchent pas d’interstitiel ; l’ouverture sportive suit le compteur commun F11 et ne reste pas bloquée par un échec publicitaire. Un changement de compte ne réutilise aucune information privée de l’ancien compte. (FR-028)
7. **A29** — **Étant donné** une erreur, un filtre actif ou un résultat homonyme, **lorsque** le parcours est utilisé avec les moyens d’accessibilité applicables, **alors** les exigences F13 s’appliquent aux libellés, sélections, états et actions de reprise sans dépendre uniquement de la couleur ; le signalement existant conserve son contexte de recherche selon F10/F11, sans nouvelle collecte implicite. (FR-029, FR-030)

### Cas limites

- Une sélection automatique de saison et une sélection explicite peuvent avoir la même valeur sans désigner le même état : découverte dans le premier cas, recherche dans le second.
- Une recherche sans texte reste exhaustive dès qu’un filtre est explicitement choisi ; aucune combinaison vide ne justifie un élargissement implicite.
- Un catalogue vide avec succès, un catalogue inaccessible et une sélection disparue sont distincts. Sans saison consultable, aucune année n’est inventée ; une indisponibilité de récupération ne prouve pas un catalogue vide.
- Une restriction connue prévaut sur la stabilité des exemples, la restauration de position et la conservation après erreur.
- Une recherche tolérante peut retrouver plusieurs identités ; elle ne rapproche pas les données sportives et ne fait pas disparaître les homonymes.

## Exigences _(obligatoire)_

### Exigences fonctionnelles

#### Accès et découverte

- **FR-001** : La recherche DOIT proposer Équipes, Poules et Clubs aux visiteurs et personnes connectées, sans compte ni Pro requis. Aucun autre type de ressource recherchable ou droit d’édition n’est introduit.
- **FR-002** : Un champ vide sans filtre explicitement choisi DOIT présenter des exemples clairement identifiés, en nombre limité, sans promesse de catalogue complet. La saison automatique de FR-012 délimite les exemples des équipes et poules sans déclencher une recherche.
- **FR-003** : Les exemples DOIVENT être non personnalisés, sans géolocalisation ajoutée, et conserver leur sélection et leur ordre pendant une visite, y compris après un retour de fiche ou d’onglet. Ils PEUVENT varier entre visites. Une restriction connue impose leur retrait ; une actualisation ne les remélange pas arbitrairement.
- **FR-004** : Une saisie non vide ou le choix explicite d’au moins un filtre DOIT déclencher une recherche dont toutes les correspondances sont accessibles. Choisir explicitement la saison déjà proposée ou « Toutes les saisons » compte comme un choix ; ce choix reste explicite tant qu’il n’est pas réinitialisé.
- **FR-005** : Le texte et les filtres actifs DOIVENT être identifiables et effaçables. Effacer le texte seul conserve les filtres ; réinitialiser les filtres restaure la saison automatique et supprime leur caractère explicite. Réinitialiser les deux restaure la découverte dans l’onglet courant, sans effacer les filtres de l’autre onglet sportif.

#### Correspondances et identités

- **FR-006** : La recherche DOIT porter sur le nom et la ville des clubs ; les noms complet et court, le club, la ville du club et la division des équipes ; les noms complet et court, la division et la ligue des poules. Les champs absents ne sont pas inventés.
- **FR-007** : La casse, les accents et les espaces superflus NE DOIVENT PAS empêcher une correspondance textuelle. Les débuts de mots DOIVENT être recherchables. Un texte composé uniquement d’espaces équivaut à une absence de texte.
- **FR-008** : Une saisie de plusieurs termes DOIT tenir compte de tous les termes, qui peuvent correspondre à plusieurs champs de la même ressource. Une correspondance sur un seul terme ne suffit pas à ignorer les autres.
- **FR-009** : La recherche DOIT tolérer les petites fautes de frappe, notamment une lettre omise dans un nom reconnaissable comme « Volly » pour « Volley », après les correspondances directes et sans résultat sans rapport ajouté pour remplir la liste. Les filtres restent strictement applicables. Cette tolérance ne crée ni alias ni identité.
- **FR-010** : Les noms publics, noms sources actuels et alias vérifiés applicables selon F02 DOIVENT permettre de retrouver la même ressource sous son nom public actuel. Les alias restent délimités par leur contexte F02. Aucun historique arbitraire de noms, alias supposé ou fusion par similarité n’est ajouté.

#### Filtres, saisons et contexte

- **FR-011** : Équipes et Poules DOIVENT proposer saison, division, format et genre, combinés entre eux et avec le texte. Chaque filtre est facultatif hors saison initiale ; une valeur non choisie ne restreint pas les résultats. Clubs NE DOIT PAS appliquer ces filtres.
- **FR-012** : Les saisons DOIVENT provenir des données consultables du type de ressource concerné, sans liste d’années fixe. Sans sélection conservée, la plus récente disponible, même future, est proposée. Les saisons antérieures et « Toutes les saisons » restent accessibles ; une saison terminée n’est pas masquée pour ce seul motif. Aucune saison n’est inventée si aucune n’est disponible.
- **FR-013** : Les choix de division DOIVENT respecter les divisions actives de F02 ; formats et genres reprennent la classification sportive F02 sans nouveau vocabulaire. Une combinaison sans correspondance NE DOIT PAS retirer un filtre ni en modifier la valeur automatiquement.
- **FR-014** : Le texte DOIT être commun aux trois onglets ; les filtres des équipes et des poules DOIVENT être mémorisés séparément pendant une visite. Passer par Clubs ne les efface pas. Modifier le texte invalide les résultats antérieurs des autres onglets sans effacer leurs filtres.
- **FR-015** : Un retour depuis une fiche DOIT restaurer onglet, texte, filtres, exemples ou résultats et position lorsqu’ils restent valides. Les changements de données peuvent nécessiter une recomposition ; ils ne garantissent pas la position exacte dans un ordre devenu différent.
- **FR-016** : Une sélection devenue indisponible DOIT rester identifiable comme telle et permettre correction ou réinitialisation, sans filtre invisible ni élargissement silencieux. Une erreur de récupération des choix NE DOIT PAS être assimilée à leur disparition.

#### Ordre, exhaustivité et présentation

- **FR-017** : Avec du texte, les résultats DOIVENT être ordonnés par pertinence, les correspondances directes précédant les approchantes. Sans texte, une recherche filtrée DOIT suivre le nom public par ordre alphabétique, sans priorité automatique aux saisons récentes. Les égalités DOIVENT avoir un départage stable pour des données inchangées.
- **FR-018** : Toutes les correspondances consultables DOIVENT être accessibles progressivement, sans plafond fonctionnel de vingt ni autre plafond total silencieux. Le nombre d’exemples et la taille des lots ne définissent pas un maximum de résultats de recherche.
- **FR-019** : Une ressource DOIT apparaître une seule fois par recherche, même si plusieurs champs ou alias correspondent. Des identités distinctes restent distinctes. Sur des données inchangées, le parcours complet NE DOIT ni dupliquer ni omettre des résultats ; après une évolution, une actualisation DOIT permettre un parcours cohérent sans omission durable.
- **FR-020** : Exemples, filtres et résultats DOIVENT respecter la consultabilité F02, notamment exclusions, divisions inactives, retraits et réapparitions. Un club sans équipe visible reste consultable, contrairement à une équipe sans participation visible. Une restriction connue prévaut sur les données conservées ; une réapparition ne lève aucun autre motif et réutilise la même identité.
- **FR-021** : Chaque résultat DOIT présenter son nom public et le contexte disponible utile à sa distinction : ville du club ; saison, division, format et genre des équipes et poules, club ou ligue lorsqu’utiles. Logos et détails inconnus restent absents ou explicitement indisponibles, sans valeur inventée ni exclusion de la ressource pour ce seul motif.
- **FR-022** : Chargement initial, chargement supplémentaire, résultat partiel, échec et fin réelle DOIVENT être distingués. Aucun total exact n’est exigé ; un nombre chargé NE DOIT PAS être présenté comme total. Une interruption ou un lot échoué NE DOIT PAS produire une fausse fin de liste.

#### Récupération, navigation et règles communes

- **FR-023** : « Aucun résultat » DOIT désigner une recherche réussie établissant l’absence de correspondance aux critères actuels. Une erreur ou une réponse incomplète, même vide, NE DOIT PAS être présentée comme une absence certaine de correspondance.
- **FR-024** : Une erreur initiale DOIT proposer une reprise sans attente indéfinie. Une actualisation ou un lot supplémentaire échoué DOIT préserver les résultats déjà obtenus encore autorisés, distinguer leur fraîcheur connue ou incertaine et permettre de réessayer sans perdre les critères. Aucun diagnostic interne n’est exposé.
- **FR-025** : Les réponses différées DOIVENT être rattachées au texte, à l’onglet et aux filtres concernés. Une réponse obsolète NE DOIT PAS remplacer le contexte courant, mélanger deux recherches ou ajouter un ancien lot à une liste actualisée.
- **FR-026** : La nouvelle consultation et l’actualisation DOIVENT appliquer les exigences de propagation et de fraîcheur de F13 aux données sportives acceptées, noms, choix et visibilités concernés. Aucun délai propre à F04 ni actualisation continue de l’écran n’est ajouté. Une restriction connue ne bénéficie pas d’une tolérance d’affichage.
- **FR-027** : Un résultat DOIT ouvrir la fiche F03 de son identité. Une cible devenue indisponible DOIT produire l’état correspondant, distingué d’une erreur réseau, sans redirection par similarité. La reprise vers la recherche conserve le contexte applicable.
- **FR-028** : F05/F09/F11 DOIVENT gouverner comptes, droits et publicité : recherche publique indépendante du Pro, isolation des éventuelles informations privées lors d’un changement de compte, aucun interstitiel déclenché par filtre, défilement, actualisation ou retour. Une ouverture de fiche sportive suit le compteur commun F11 et ne reste pas bloquée par un échec publicitaire.
- **FR-029** : L’entrée de signalement existante DOIT conserver son contexte de recherche et les limites F10/F11. F04 NE DOIT PAS ajouter de personnalisation, géolocalisation, publication de saisies, suivi analytique ou collecte implicite ; la confidentialité et la minimisation restent régies par F11.
- **FR-030** : Les exigences F13 de performance, accessibilité, erreurs et diagnostic DOIVENT s’appliquer aux parcours F04. Les onglets, filtres, informations de distinction, états de chargement et reprises DOIVENT être compréhensibles avec les moyens d’accessibilité applicables, sans distinction reposant uniquement sur la couleur.

### Entités clés

- **Ressource recherchable** : Club, Équipe ou Poule existant selon F02, avec une identité stable, ses noms applicables, son contexte et sa consultabilité.
- **Contexte de recherche** : Onglet, texte partagé, filtres propres à l’onglet et distinction entre saison automatique et choix explicite ; il détermine découverte ou recherche.
- **Exemples** : Sélection limitée de ressources consultables, non personnalisée et stable pendant une visite ; elle ne représente pas un total.
- **Résultats** : Correspondances ordonnées d’un contexte, avec leur état de chargement, de complétude et de fraîcheur ; leur quantité chargée n’est pas leur total.
- **Visite** : Parcours de recherche conservé pendant les changements d’onglet et les allers-retours avec les fiches. La persistance entre deux lancements n’est pas exigée.

## Critères de réussite _(obligatoire)_

### Résultats mesurables

- **SC-001** : Les trois onglets sont utilisables dans tous les états d’accès d’A01 ; aucun compte ou achat n’est nécessaire pour rechercher. (FR-001, FR-028)
- **SC-002** : Tous les cas A02–A04 distinguent exemples et recherche exhaustive ; aucune sélection explicite n’est limitée aux exemples. (FR-002–FR-005, FR-012)
- **SC-003** : Les cas textuels A05–A10 retrouvent les identités attendues, sans fusion, doublon ni contournement des filtres ; les correspondances directes précèdent les approchantes. (FR-006–FR-011, FR-017, FR-019)
- **SC-004** : Les cas A11–A16 conservent les choix propres à chaque onglet, exposent les saisons consultables et rendent explicite toute sélection devenue indisponible, sans élargissement silencieux. (FR-011–FR-016, FR-020)
- **SC-005** : Sur le jeu stable de 47 correspondances d’A17, les 47 identités sont accessibles exactement une fois ; A18–A22 couvrent ordre, homonymes, restrictions et actualisation sans faux total. (FR-017–FR-022, FR-025–FR-027)
- **SC-006** : Dans tous les cas A23–A26, panne, liste partielle et absence réelle restent distinctes ; aucun ancien résultat ne remplace la recherche actuelle et les reprises préservent le contexte encore valide. (FR-022–FR-025)
- **SC-007** : La qualification des parcours A27–A29 satisfait les objectifs communs F13, les règles publicitaires F11 et l’isolation F05/F09, sans nouveau seuil ou collecte F04. (FR-026, FR-028–FR-030)

## Hypothèses

- Les données disponibles sont celles publiables selon F02 ; F04 ne récupère ni ne recrée une identité ou une saison manquante. La reprise V1 appartient à F14.
- Les quatre filtres sportifs sont à choix unique chacun ; leur absence vaut toutes les valeurs autorisées. La saison initiale est la plus récente du type de ressource, sans dépendre des autres filtres ni de la date civile du téléphone.
- Les sélections restent inchangées pendant la visite tant qu’elles sont valides, même lorsqu’une saison plus récente apparaît ; une réinitialisation reprend la plus récente disponible.
- Une actualisation conserve le mode de découverte ou de recherche et les choix valides. Les changements de catalogue peuvent modifier l’ordre ou le nombre des résultats : aucune photographie éternellement figée n’est promise.
- La tolérance de recherche ne modifie pas les règles d’identité F02, où les accents et chiffres peuvent être significatifs. Le réglage technique de pertinence devra satisfaire les scénarios, sans choisir ici un moteur, un score ou une distance de comparaison.
- Taille des lots, nombre visuel d’exemples et détails de départage ne constituent pas de nouveaux choix métier ; R02 définira leur présentation accessible, puis la phase technique leur réalisation. Aucun total obligatoire, nouvelle ressource recherchable ou historique de recherche n’est ajouté.
- Cette livraison porte uniquement sur les exigences. R01, R02 et l’acceptation globale sous #247 précèdent la planification technique.

## Éléments probants et traçabilité

### Sources V1

Les observations suivantes décrivent le dépôt V1, pas une qualification de la V2 ni une mesure de production.

| Source                                                                                                                                                                                     | Observation et traitement dans F04                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Inventaire V1](../../docs/product/v1-functional-inventory.md), V1-04, G09, G16                                                                                                            | Trois types recherchables et quatre filtres conservés ; erreurs, complétude et saisons définies explicitement.                                                                                                                                                                                        |
| [Reader de recherche](../../apps/backend/search-service/src/main/java/com/blockout/search/search/infrastructure/elasticsearch/ElasticsearchSearchReader.java)                              | Cinq suggestions sur texte vide, vingt résultats textuels, absence de pagination et exceptions ramenées à une liste vide. F04 exige des exemples distincts, tous les résultats accessibles et des erreurs explicites. Les limites de temps ou d’examen internes ne deviennent pas des règles produit. |
| [Définitions V1 des index](../../apps/backend/search-worker/src/main/resources/elasticsearch)                                                                                              | Champs de noms/contexte, casse et accents observables ; leurs pondérations et structures ne prescrivent ni moteur ni classement technique V2. Les fautes tolérées et alias sont des exigences F04, pas une preuve de prise en charge V1.                                                              |
| [Écran de recherche](../../apps/frontend/mobile/src/modules/search/ui/search-screen.tsx), [filtres](../../apps/frontend/mobile/src/modules/search/hooks/use-competition-search-filters.ts) | Texte commun, filtres locaux aux onglets remontés et saisons codées en dur. F04 conserve le texte commun, mémorise séparément les filtres pendant la visite et utilise les saisons disponibles. Le délai de saisie V1 reste un détail technique.                                                      |
| [Résultats](../../apps/frontend/mobile/src/modules/search/ui/search-results.tsx), [présentation](../../apps/frontend/mobile/src/modules/search/view-models/search-card-presentation.ts)    | Exemples déterminés par texte vide, cartes, états mobiles et liste finie. F04 distingue choix explicite, reprise partielle, contexte des homonymes et absence de total obligatoire.                                                                                                                   |
| [Recherche équipes](../../apps/frontend/mobile/src/modules/search/ui/search-team-screen.tsx), [poules](../../apps/frontend/mobile/src/modules/search/ui/search-pool-screen.tsx)            | Navigation sportive et filtres conservés fonctionnellement ; les mécanismes publicitaires suivent F11.                                                                                                                                                                                                |
| [Continuité identité/Pro](../../docs/product/identity-and-pro-continuity.md)                                                                                                               | Aucun nouveau bénéfice Pro, rapprochement de comptes ou transfert d’identité n’est induit par la recherche.                                                                                                                                                                                           |

Les nombres cinq et vingt, les trois années fixes, l’ordre aléatoire à chaque requête et les exceptions masquées ne sont pas reconduits comme obligations. Les changements fonctionnels retenus sont exprimés directement dans FR-002–FR-026 ; les détails de moteur, délais internes, temporisation de saisie et pondérations restent des preuves V1, sans imposer leur conservation. Les champs, onglets, filtres, navigation et signalement existants sont conservés dans le périmètre prévu.

### Couverture de l’inventaire et des décisions

| Couverture                                                     | Exigences F04                | Scénarios        |
| -------------------------------------------------------------- | ---------------------------- | ---------------- |
| V1-04 : accès, exemples et passage à la recherche              | FR-001–FR-005, FR-028        | A01–A04, A28     |
| V1-04 : champs, tolérance, noms et identités                   | FR-006–FR-010, FR-019        | A05–A10          |
| V1-04 / G16 : filtres, saisons et contexte                     | FR-011–FR-016                | A11–A16          |
| G09 : ordre, exhaustivité, décompte, erreurs et reprise        | FR-017–FR-019, FR-022–FR-025 | A17–A18, A22–A26 |
| F02 / F03 : visibilité, historique, présentation et navigation | FR-020–FR-021, FR-027        | A16, A19–A22     |
| F05 / F09 / F10 / F11 / F13 : règles communes                  | FR-026, FR-028–FR-030        | A27–A29          |

<a id="cross-perimeter-dependencies"></a>

### Dépendances entre périmètres

| Périmètre propriétaire                                                                                     | Accord avec F04                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F01](../001-source-acquisition/spec.md) / [F02](../002-sporting-data/spec.md)                             | Acquisition et vérité sportive, noms, alias vérifiés, saisons, classification, identité et visibilité. F04 les consomme sans assimiler historique et inactivité.                                                                                                |
| [F03](../007-sporting-consultation/spec.md)                                                                | Destinations et indisponibilité des fiches ; F04 ne recherche pas les matchs et ne redéfinit pas leurs calendriers ou horaires.                                                                                                                                 |
| [F05](../005-accounts-identity/spec.md) / F06                                                              | Accès invité, sessions et isolation ; F06 possède les suivis, sans personnalisation de découverte ajoutée ici.                                                                                                                                                  |
| [F09](../006-pro-subscriptions/spec.md) / [F11](../004-advertising-privacy-legal/spec.md)                  | Droits, compteur publicitaire, confidentialité et minimisation ; aucune recherche payante ou nouvelle collecte.                                                                                                                                                 |
| [F10](../012-reports-feature-suggestions/spec.md) / [F12](../013-administration-app-configuration/spec.md) | Signalement contextualisé et permissions d’administration, sans nouvel éditeur ni autorisation implicite.                                                                                                                                                       |
| [F13](../003-shared-quality/spec.md)                                                                       | Performance, disponibilité, fraîcheur, accessibilité et diagnostics ; les durées V1 ne sont pas reprises comme objectifs.                                                                                                                                       |
| [F14](../014-v1-v2-transition/spec.md) / R01 / R02                                                         | Reprise des données, cohérence globale et conception visuelle. R02 couvre exemples/recherche, filtres actifs ou indisponibles, homonymes, chargements successifs, liste partielle et reprise accessible. Aucun écran Figma n’est déclaré validé par cette spec. |
