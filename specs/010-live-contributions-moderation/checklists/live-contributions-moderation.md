# Checklist de relecture : contributions de liens de diffusion et modération

**Objectif** : Examiner la complétude, la clarté et la cohérence des exigences F08 avant acceptation fonctionnelle globale

**Créée le** : 2026-09-22

**Fonctionnalité** : [Spécification F08](../spec.md)

**Responsabilité** : Checklist de qualité des exigences réservée au relecteur, préparée avec `speckit-checklist`. Une case cochée signifie que le critère rédactionnel a été examiné et satisfait ; elle ne signifie pas que le logiciel est implémenté ou validé. Les cases sont laissées non cochées à la génération.

## Complétude de l’éligibilité

- [ ] CHK001 Les acteurs, permissions de publication, profil indisponible et absence de privilège Pro sont-ils explicitement distingués ? [Complétude, Spécification §FR-001, §FR-027, §A01, §A09]
- [ ] CHK002 Les trois plateformes et les adresses de vidéos, directs, chaînes ou pages sont-elles délimitées sans promesse de disponibilité ou de diffusion vérifiée ? [Clarté, Spécification §FR-002, §A02]
- [ ] CHK003 L’interdiction professionnelle couvre-t-elle les modérateurs et les phases sans équivalent FFVB sans dépendre d’un code fournisseur isolé ? [Cohérence, Spécification §FR-003, §A03]
- [ ] CHK004 La borne de sept jours, la preuve Auth0, son absence et l’exception autorisée sont-elles cohérentes avec F05 ? [Clarté, Spécification §FR-004–FR-005, §FR-027, §A04]
- [ ] CHK005 Les conditions avant et à H−1, l’heure inconnue et l’absence de date sont-elles séparées sans horaire inventé ? [Couverture, Spécification §FR-006–FR-007, §FR-033, §A05–A06]
- [ ] CHK006 La validation après-match dépend-elle du résultat définitif F02 plutôt que de la catégorie F03, d’un score provisoire ou du seul temps écoulé ? [Cohérence, Spécification §FR-008–FR-009, §A07–A08]

## Propriété, propositions et quotas

- [ ] CHK007 L’unicité du lien actif et la coexistence avec des propositions privées sont-elles définies sans confusion entre état actif et visibilité publique ? [Clarté, Spécification §FR-010, §FR-033, §Tableau des transitions]
- [ ] CHK008 Les droits du propriétaire, des autres utilisateurs et du modérateur, y compris pour un lien sans propriétaire, sont-ils explicites ? [Complétude, Spécification §FR-011, §FR-016, §FR-027, §FR-034, §A10, §A15]
- [ ] CHK009 Le remplacement immédiat et le maintien de l’ancien lien pendant une attente sont-ils cohérents avec rejet, annulation et retrait indépendant ? [Cohérence, Spécification §FR-012–FR-013, §A10–A11, §A16]
- [ ] CHK010 Le remplacement d’une proposition du même auteur suit-il les conditions courantes après correction sportive, avec caducité de l’ancienne proposition uniquement lors de l’enregistrement de la nouvelle version, publication immédiate ou attente selon le cas, et conservation lors d’un refus ? [Couverture, Spécification §FR-009, §FR-012–FR-014, §FR-019, §A12, §A16]
- [ ] CHK011 La consultation et l’annulation de sa propre proposition sont-elles décrites sans accès aux propositions d’autrui ou à l’historique privé ? [Complétude, Spécification §FR-015, §A13, §A39]
- [ ] CHK012 Le retrait du lien actif est-il distinct de l’annulation de sa proposition et du retrait d’une version ultérieure ? [Clarté, Spécification §FR-016, §FR-036, §A14, §A35]
- [ ] CHK013 Les trois versions cumulées avant et après-match incluent-elles la première version et celles en attente, sans remboursement après décision négative ? [Clarté, Spécification §FR-017, §FR-019, §A17]
- [ ] CHK014 Le quota quotidien inclut-il les matchs déjà contribués auparavant, sans compter plusieurs fois un même match aujourd’hui ? [Couverture, Spécification §FR-018, §A18]
- [ ] CHK015 La journée de Paris, les changements d’heure et l’échéance présentée à New York sont-ils cohérents sans renouvellement par changement de fuseau ? [Cohérence, Spécification §FR-018, §A19]
- [ ] CHK016 Refus, répétitions identiques, approbations et réactivations sont-ils distingués d’une nouvelle version consommant les quotas ? [Clarté, Spécification §FR-019–FR-020, §A20–A21]

## Signalements et modération

- [ ] CHK017 Le motif, les permissions, le signalement du lien d’autrui et l’absence de seuil d’ancienneté pour signaler sont-ils spécifiés ? [Complétude, Spécification §FR-021, §A22]
- [ ] CHK018 La déduplication est-elle définie par déclarant, version et période, sans transfert vers un lien ou une période apparus entre-temps ? [Clarté, Spécification §FR-022, §FR-036, §A23, §A35]
- [ ] CHK019 Les seuils de trois et dix et leur évaluation lors d’un nouveau signalement sont-ils cohérents avec les corrections de résultat ? [Couverture, Spécification §FR-023, §A24, §A27]
- [ ] CHK020 L’attente imposée à tous les nouveaux auteurs après masquage interdit-elle clairement le contournement par changement d’adresse ou de compte ? [Cohérence, Spécification §FR-024, §A25]
- [ ] CHK021 Les actions résolvant cette attente sont-elles distinguées du simple rejet, de l’annulation et de la validation après-match qui reste applicable ? [Clarté, Spécification §FR-025, §A28]
- [ ] CHK022 La réactivation conserve-t-elle l’historique tout en ouvrant un compteur neuf, avec nouveau signalement possible et absence de réinitialisation sur rejeu ? [Couverture, Spécification §FR-026, §FR-037, §A26, §A36]
- [ ] CHK023 Les exceptions de modération restent-elles propres aux actions, sans autorisation universelle de publication, retrait ou contournement des restrictions ? [Cohérence, Spécification §FR-027, §A09, §A29]
- [ ] CHK024 La liste de modération, l’historique utile et leur confidentialité sont-ils définis sans imposer une architecture d’audit ? [Complétude, Spécification §FR-028, §A29, §A34]
- [ ] CHK025 Les transitions d’approbation, rejet et réactivation précisent-elles leurs états admissibles et l’effet sur le propriétaire et l’ancien lien actif ? [Clarté, Spécification §FR-029–FR-031, §A30–A32, §Tableau des transitions]
- [ ] CHK026 La caducité des autres propositions après sélection par modération et l’information de leurs auteurs sont-elles explicites, sans approbation tardive implicite ? [Couverture, Spécification §FR-032, §A30–A32]

## Cohérence transversale et qualité d’acceptation

- [ ] CHK027 Les restrictions sportives, l’examen privé et les motifs de modération se cumulent-ils sans republication par réapparition ou réactivation ? [Cohérence, Spécification §FR-033, §A34]
- [ ] CHK028 La suppression de compte distingue-t-elle attribution personnelle, propriété, compteurs et décisions conservés, sans durée globale inventée ? [Complétude, Spécification §FR-034, §A15, §A38]
- [ ] CHK029 Les publications concurrentes, quotas simultanés et actions obsolètes ont-ils des résultats explicites sans double actif ni écrasement silencieux ? [Couverture, Spécification §FR-035–FR-036, §A33, §A35]
- [ ] CHK030 Succès, refus, échec, incertitude et lecture échouée après mutation confirmée sont-ils séparés avec des reprises sans effets dupliqués ? [Cohérence, Spécification §FR-037–FR-038, §A36–A37]
- [ ] CHK031 Les états personnels et de modération reprennent-ils les exigences F13 d’accessibilité, de français, de fraîcheur et de protection sans nouveaux seuils techniques ? [Complétude, Spécification §FR-039, §A39]
- [ ] CHK032 Les responsabilités F07/F10/F12/R02 et les besoins visuels sont-ils explicites sans notification ou conception déclarée livrée ? [Délimitation, Spécification §FR-040–FR-041, §A40, §Dépendances entre périmètres]
- [ ] CHK033 Chaque exigence dispose-t-elle de scénarios et de critères mesurables, avec cas positifs, refus, limites et reprises ? [Traçabilité, Spécification §SC-001–SC-007, §Couverture de l’inventaire et des décisions]
- [ ] CHK034 Les observations V1, les décisions fonctionnelles et les futures validations logicielles restent-elles séparées, sans détail d’implémentation imposé ? [Cohérence, Spécification §Sources V1, §Hypothèses et limites]

## Notes

- Les marqueurs appartiennent au relecteur. `speckit-implement` peut les lire comme prérequis, mais ne doit pas les cocher.
- La [checklist de qualité intégrée](requirements.md) suit le cycle Specify/Clarify et ne remplace pas cette relecture.
- La revue globale R01, la conception R02 et l’acceptation sous #247 restent nécessaires avant toute planification technique.
