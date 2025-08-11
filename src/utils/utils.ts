import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pool } from '../types/Pool';
import tinycolor from 'tinycolor2';
import { Division } from '../types/Division';
import { TeamHighlight } from '../types/Team';
import { useAppTheme } from '../context/ThemeProvider';
import { AppTheme } from '../types/Theme';

export type GradientVariants = {
    base: readonly [string, string, ...string[]];
    light: readonly [string, string, ...string[]];
    lighter: readonly [string, string, ...string[]];
    dark: readonly [string, string, ...string[]];
    darker: readonly [string, string, ...string[]];
};

export const getGradientVariants = (
    colors: readonly [string, string, ...string[]]
): GradientVariants => {
    return {
        base: colors.map((c) => tinycolor(c).toHexString()) as [string, string, ...string[]],
        light: colors.map((c) => tinycolor(c).lighten(15).toHexString()) as [string, string, ...string[]],
        lighter: colors.map((c) => tinycolor(c).lighten(30).toHexString()) as [string, string, ...string[]],
        dark: colors.map((c) => tinycolor(c).darken(15).toHexString()) as [string, string, ...string[]],
        darker: colors.map((c) => tinycolor(c).darken(20).toHexString()) as [string, string, ...string[]],
    };
};

export function formatDateFrenchLocale(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function splitIsoDate(isoString: string) {
    const dateObj = parseISO(isoString);
    const date = format(dateObj, 'yyyy-MM-dd');
    const time = format(dateObj, 'HH:mm:ss');
    return { date, time };
}

export function splitIsoDateFormatted(
    isoString: string
) {
    const dateObj = parseISO(isoString);
    const loc = fr;

    const date = format(dateObj, 'd MMM yyyy', { locale: loc });
    const time = format(dateObj, 'HH:mm', { locale: loc });

    return { date, time };
}

export const getLeagueLabel = (division: Division, pool: Pool) => `${division.name} - ${pool.gender}`;

export function getTeamsRankingColor(
    theme: AppTheme,
    enrichedMatch: {
        teamA: { id: number };
        teamB: { id: number };
        set: string | null;
        highlightColor: string;
    }
): TeamHighlight[] {
    const { teamA, teamB, set, highlightColor } = enrichedMatch;

    if (!set || set.trim() === "") {
        return [
            { teamId: teamA.id, color: `${highlightColor}` },
            { teamId: teamB.id, color: `${highlightColor}` },
        ];
    }

    const sets = set
        .split(" ")
        .map(s => s.split("-").map(Number))
        .filter(([a, b]) => !isNaN(a) && !isNaN(b));

    if (sets.length === 0) return [];

    const teamAWins = sets.filter(([a, b]) => a > b).length;
    const teamBWins = sets.filter(([a, b]) => b > a).length;

    if (teamAWins > teamBWins) {
        return [
            { teamId: teamA.id, color: `${theme.success}70` },
            { teamId: teamB.id, color: `${theme.error}70` },
        ];
    } else {
        return [
            { teamId: teamB.id, color: `${theme.success}70` },
            { teamId: teamA.id, color: `${theme.error}70` },
        ];
    }
}