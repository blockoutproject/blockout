import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  House,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SportingDivisionResponse } from "../../.generated/schemas/index.zod";
import { DivisionPaint } from "../features/sporting/components/division-paint";
import { MatchSurface } from "../features/sporting/components/match-surface";
import { SportingMedia } from "../features/sporting/components/sporting-media";
import { divisionTextColor } from "../features/sporting/presentation";
import { BrandMark } from "../shared/components/brand-mark";
import { IconButton } from "../shared/components/icon-button";
import { SearchField } from "../shared/components/search-field";
import { useTheme } from "../shared/theme/theme-provider";
import { tokens } from "../shared/theme/tokens";
import type { DemoMatch } from "./tab-view-fixtures";

const divisions: SportingDivisionResponse[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Prénationale",
    color: "#C74750",
    gradient: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Ligue B",
    color: "#F2A900",
    gradient: null,
  },
];

/** Stable fictional result names shared with the host's local text filtering. */
export const trialSearchNames = [
  "Volley des Deux Rives",
  "Étoile du Littoral",
  "Union Volley Atlantique",
  "Volley des Deux Rives (réserve)",
] as const;

/** Supplies explicit illustrative monograms for local fixtures, never provider artwork or a logo read. */
function trialIdentity(name: string) {
  return {
    name,
    shortName: name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase(),
  };
}

/** Home's 48-point brand row; the host owns safe areas, scrolling and the example menu. */
export function TrialHomeBrand({
  onChooseExample,
  onOpenSearch,
}: {
  onChooseExample: () => void;
  onOpenSearch: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.topBar}>
      <View style={styles.brand}>
        <BrandMark />
        <Text style={[tokens.typography.headingXl, { color: colors.text }]}>
          Blockout
        </Text>
      </View>
      <View style={styles.headerActions}>
        <IconButton label="Ouvrir la recherche" onPress={onOpenSearch}>
          <Search color={colors.icon} size={24} />
        </IconButton>
        <IconButton label="Choisir un exemple" onPress={onChooseExample}>
          <Ellipsis color={colors.icon} size={24} />
        </IconButton>
      </View>
    </View>
  );
}

/** Stable illustrative season; the host places this 34-point pill beside Home's compact tab rail. */
export function TrialSeasonPill() {
  const { colors } = useTheme();
  return (
    <View style={styles.seasonTarget}>
      <View
        accessible
        accessibilityLabel="Saison 2026/2027"
        style={[
          styles.seasonPill,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[tokens.typography.label, { color: colors.text }]}>
          2026/2027
        </Text>
        <ChevronDown accessible={false} color={colors.icon} size={16} />
      </View>
    </View>
  );
}

/** Team identity from Product Design 1010:15711, with fictional media and a static followed state. */
export function TrialTeamCard() {
  const { colors } = useTheme();
  return (
    <MatchSurface division={divisions[0]}>
      <View style={styles.teamCard}>
        <View style={styles.teamRail}>
          <DivisionPaint division={divisions[0]} />
          <SportingMedia
            identity={trialIdentity("Volley des Deux Rives")}
            kind="team"
            size={64}
          />
        </View>
        <View style={styles.teamIdentity}>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Prénationale masculine
          </Text>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.title, { color: colors.text }]}
          >
            Volley des Deux Rives
          </Text>
          <View style={styles.badges}>
            <TrialBadge label="2026/2027" />
            <TrialBadge label="6 × 6" />
            <Text style={[tokens.typography.metadata, { color: colors.text }]}>
              Voir le club ›
            </Text>
          </View>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <View style={styles.followRow}>
            <View
              accessible
              accessibilityLabel="Équipe suivie, exemple"
              style={[styles.followPill, { backgroundColor: colors.inverse }]}
            >
              <Check accessible={false} size={16} color={colors.onInverse} />
              <Text
                style={[tokens.typography.label, { color: colors.onInverse }]}
              >
                Suivi
              </Text>
            </View>
            <Users accessible={false} color={colors.icon} size={18} />
            <Text style={[tokens.typography.metadata, { color: colors.text }]}>
              2
            </Text>
          </View>
        </View>
      </View>
    </MatchSurface>
  );
}

/** Source-shaped detail chrome; the host may supply its compact identity between the chooser controls. */
export function TrialDetailBar({
  onChooseExample,
  children,
}: {
  onChooseExample: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.topBar}>
      <IconButton label="Retour aux exemples" onPress={onChooseExample}>
        <ChevronLeft color={colors.icon} size={24} />
      </IconButton>
      <View style={styles.flex}>{children}</View>
      <IconButton label="Choisir un exemple" onPress={onChooseExample}>
        <Ellipsis color={colors.icon} size={24} />
      </IconButton>
    </View>
  );
}

/** Controlled search field and fixture filter affordance; tabs, sticky heading and blur belong to the host. */
export function TrialSearchBar({
  value,
  onChangeText,
  onChooseExample,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onChooseExample: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.searchBar}>
      <View style={styles.flex}>
        <SearchField
          label="Rechercher une équipe"
          placeholder="Rechercher une équipe…"
          value={value}
          onChangeText={onChangeText}
          onClear={() => onChangeText("")}
          autoCorrect={false}
        />
      </View>
      <View style={[styles.filter, { backgroundColor: colors.surface }]}>
        <IconButton
          label="Options de filtre de l’exemple"
          onPress={onChooseExample}
          size="control"
        >
          <SlidersHorizontal color={colors.icon} size={24} />
        </IconButton>
        <View
          pointerEvents="none"
          style={[styles.filterEdge, { borderColor: colors.border }]}
        />
      </View>
    </View>
  );
}

/** One bounded pool group; the host supplies at most three matches and virtualizes all other groups. */
export function TrialPoolCard({
  matches,
  poolIndex,
  completed,
  onOpenTeam,
}: {
  matches: DemoMatch[];
  poolIndex: number;
  completed: boolean;
  onOpenTeam: () => void;
}) {
  const division = divisions[poolIndex % divisions.length];
  const foreground = divisionTextColor(division.color);
  return (
    <MatchSurface division={division}>
      <View style={styles.groupInset}>
        <View style={styles.poolHeader}>
          <DivisionPaint division={division} />
          <SportingMedia
            identity={trialIdentity(division.name)}
            kind="division"
            size={40}
          />
          <View style={styles.flex}>
            <Text style={[tokens.typography.strong, { color: foreground }]}>
              {poolIndex % 2 === 0
                ? "Poule A de Prénationale"
                : "Ligue B Masculine"}
            </Text>
            <Text style={[tokens.typography.metadata, { color: foreground }]}>
              {division.name} masculine
              {`\n${matches.length} match${matches.length > 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>
        <View style={styles.matches}>
          {matches.map((match) => (
            <TrialMatch
              key={match.id}
              match={match}
              completed={completed}
              color={division.color}
              foreground={foreground}
              onOpenTeam={onOpenTeam}
            />
          ))}
        </View>
      </View>
    </MatchSurface>
  );
}

/** Single fictitious match card; team navigation stays with the host rather than the router. */
function TrialMatch({
  match,
  completed,
  color,
  foreground,
  onOpenTeam,
}: {
  match: DemoMatch;
  completed: boolean;
  color: string;
  foreground: string;
  onOpenTeam: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${match.home} contre ${match.away}, ouvrir l’équipe`}
      onPress={onOpenTeam}
      style={({ pressed }) => [
        styles.match,
        {
          borderColor: `${color}${tokens.sporting.borderAlpha}`,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <View style={styles.flex}>
        {[match.home, match.away].map((name, index) => (
          <View
            key={index}
            style={[
              styles.matchTeam,
              { backgroundColor: colors.surface },
              index === 1 && {
                borderTopWidth: tokens.border.thin,
                borderTopColor: `${color}${tokens.sporting.borderAlpha}`,
              },
            ]}
          >
            <SportingMedia
              identity={trialIdentity(name)}
              kind="team"
              size={28}
            />
            <Text style={[styles.matchName, { color: colors.text }]}>
              {name.toUpperCase()}
            </Text>
            {completed && (
              <Text style={[styles.score, { color }]}>
                {index === 0 ? "3" : "1"}
              </Text>
            )}
          </View>
        ))}
      </View>
      {!completed && (
        <View style={[styles.time, { backgroundColor: color }]}>
          <Text style={[tokens.typography.strong, { color: foreground }]}>
            19:00
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Fictional search result reproducing the published Entity Card anatomy without network-backed media. */
export function TrialSearchResult({
  index,
  onOpenTeam,
}: {
  index: number;
  onOpenTeam: () => void;
}) {
  const { colors } = useTheme();
  const name = trialSearchNames[index % trialSearchNames.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir l’équipe ${name}`}
      onPress={onOpenTeam}
      style={({ pressed }) => ({
        opacity: pressed ? tokens.opacity.pressed : 1,
      })}
    >
      <MatchSurface division={divisions[0]}>
        <View style={styles.resultIdentity}>
          <DivisionPaint division={divisions[0]} />
          <SportingMedia
            identity={trialIdentity(name)}
            kind="team"
            size={48}
            presentation="entity"
          />
          <View style={styles.resultName}>
            <Text
              style={[
                tokens.typography.navigation,
                { color: colors.onDarkAccent },
              ]}
            >
              {name}
            </Text>
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.onDarkAccent },
              ]}
            >
              Volley des Deux Rives à Niort
            </Text>
          </View>
          <ChevronRight
            accessible={false}
            color={colors.onDarkAccent}
            size={20}
          />
        </View>
        <View style={styles.resultMetadata}>
          <TrialBadge label="Prénationale" accent />
          <TrialBadge label="2026/2027" />
          <TrialBadge label="6 × 6" />
          <TrialBadge label="Masculin" />
        </View>
      </MatchSurface>
    </Pressable>
  );
}

/** Read-only metadata badge shared by the fictitious team and search cards. */
function TrialBadge({
  label,
  accent = false,
}: {
  label: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: accent ? divisions[0].color : colors.border,
          backgroundColor: accent ? divisions[0].color : colors.subtle,
        },
      ]}
    >
      <Text
        style={[
          tokens.typography.metadata,
          { color: accent ? colors.onDarkAccent : colors.secondaryText },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/** Source-shaped bottom destinations; unavailable product areas open the local chooser instead of providers. */
export function TrialBottomNavigation({
  selected,
  onHome,
  onSearch,
  onChooseExample,
}: {
  selected: "home" | "search" | "profile";
  onHome: () => void;
  onSearch: () => void;
  onChooseExample: () => void;
}) {
  const { colors, membership } = useTheme();
  const items = [
    { id: "home", label: "Accueil", Icon: House, onPress: onHome },
    { id: "search", label: "Rechercher", Icon: Search, onPress: onSearch },
    {
      id: "notifications",
      label: "Notifications",
      Icon: Bell,
      onPress: onChooseExample,
    },
    {
      id: "profile",
      label: "Profil",
      Icon: UserRound,
      onPress: onChooseExample,
    },
  ];
  return (
    <View style={styles.bottomOuter}>
      <View
        style={[
          styles.bottomCapsule,
          { backgroundColor: colors.raised, borderColor: colors.border },
        ]}
      >
        {items.map(({ id, label, Icon, onPress }) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: selected === id }}
            accessibilityLabel={label}
            onPress={onPress}
            style={({ pressed }) => [
              styles.bottomItem,
              {
                backgroundColor:
                  selected === id ? membership.fill : "transparent",
                opacity: pressed ? tokens.opacity.pressed : 1,
              },
            ]}
          >
            <Icon
              accessible={false}
              color={selected === id ? membership.content : colors.icon}
              size={24}
            />
            <Text
              style={[
                tokens.typography.navigationLabel,
                { color: selected === id ? membership.content : colors.text },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  topBar: {
    minHeight: tokens.layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  headerActions: { flexDirection: "row" },
  seasonTarget: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  seasonPill: {
    minHeight: 34,
    borderRadius: tokens.radius.full,
    borderWidth: tokens.border.thin,
    paddingHorizontal: tokens.spacing.md,
    flexDirection: "row",
    gap: tokens.spacing.sm,
    alignItems: "center",
  },
  teamCard: { minHeight: 200, flexDirection: "row" },
  teamRail: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  teamIdentity: {
    flex: 1,
    minWidth: 0,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.tight,
  },
  badge: {
    minHeight: 24,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: tokens.border.thin,
    justifyContent: "center",
  },
  rule: { height: tokens.border.thin, marginVertical: tokens.spacing.xs },
  followRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  followPill: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 36,
    alignItems: "center",
    marginRight: tokens.spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    alignItems: "flex-start",
  },
  filter: {
    width: tokens.size.control.default,
    height: tokens.size.control.default,
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  filterEdge: {
    ...StyleSheet.absoluteFill,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  groupInset: { padding: tokens.spacing.xs },
  poolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderTopLeftRadius: tokens.radius.panelInset,
    borderTopRightRadius: tokens.radius.panelInset,
    overflow: "hidden",
  },
  matches: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  match: {
    flexDirection: "row",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  matchTeam: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
  },
  matchName: { ...tokens.typography.strong, flex: 1, minWidth: 0 },
  time: { width: 56, alignItems: "center", justifyContent: "center" },
  score: { ...tokens.typography.heading, minWidth: 24, textAlign: "center" },
  resultIdentity: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
    overflow: "hidden",
  },
  resultName: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  resultMetadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: tokens.spacing.md,
    gap: tokens.spacing.tight,
  },
  bottomOuter: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  bottomCapsule: {
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    flexDirection: "row",
    padding: tokens.spacing.xs,
    gap: tokens.spacing.xs,
  },
  bottomItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    borderRadius: tokens.radius.panelInset,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.optical,
    paddingVertical: tokens.spacing.xs,
  },
});
