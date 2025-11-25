import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pool } from '../types/Pool';
import tinycolor from 'tinycolor2';
import { Division } from '../types/Division';
import { TeamHighlight } from '../types/Team';
import { AppTheme } from '../types/Theme';
import snakecaseKeys from "snakecase-keys";

export type GradientVariants = {
    base: readonly [string, string, ...string[]];
    light: readonly [string, string, ...string[]];
    lighter: readonly [string, string, ...string[]];
    dark: readonly [string, string, ...string[]];
    darker: readonly [string, string, ...string[]];
};

export const isLNV = (code: string): boolean => {
    return code.toLowerCase() === 'aalnv'
}

export const isRegional = (code: string): boolean => {
    return !['aalnv', 'abccs'].includes(code.toLowerCase());
}

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

    const stringifiedDate = date.toLocaleDateString('fr-FR', {
        weekday: "short",
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    return stringifiedDate.charAt(0).toUpperCase() + stringifiedDate.slice(1);
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

export function withAlpha(color: string, alpha: number): string {
    if (!color) return `rgba(0,0,0,${alpha})`;

    if (color.startsWith("#")) {
        let hex = color.slice(1);

        if (hex.length === 3) {
            hex = hex.split("").map(c => c + c).join("");
        }

        if (hex.length === 8) {
            hex = hex.slice(0, 6);
        }

        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    if (color.startsWith("rgb")) {
        const nums = color.match(/\d+(\.\d+)?/g);
        if (nums && nums.length >= 3) {
            const [r, g, b] = nums.slice(0, 3).map(Number);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    if (alpha === 1) return color;
    return `rgba(0,0,0,${alpha})`;
}

export function computeMaxFitCount(params: {
    containerWidth: number;
    pillWidths: number[];
    gap: number;
}): number {
    const { containerWidth, pillWidths, gap } = params;
    let count = 0;
    let current = 0;

    for (let i = 0; i < pillWidths.length; i++) {
        const w = pillWidths[i];
        const next = count === 0 ? w : current + gap + w;
        if (next <= containerWidth) {
            count += 1;
            current = next;
        } else {
            break;
        }
    }
    return count;
}

export function computeBalancedRowsByCount(params: {
    containerWidth: number;
    pillWidths: number[];
    gap: number;
}): { topIndices: number[]; bottomIndices: number[] } {
    const { containerWidth, pillWidths, gap } = params;
    const n = pillWidths.length;
    if (n === 0) return { topIndices: [], bottomIndices: [] };

    // Cible équilibrée par NOMBRE
    const desiredTop = Math.ceil(n / 2);

    // Capacité réelle maximale de la 1ʳᵉ ligne
    const maxFitTop = computeMaxFitCount({ containerWidth, pillWidths, gap });

    // On prend le minimum entre la cible et la capacité réelle
    const topCount = Math.max(1, Math.min(desiredTop, maxFitTop));

    const indices = Array.from({ length: n }, (_, i) => i);
    return {
        topIndices: indices.slice(0, topCount),
        bottomIndices: indices.slice(topCount),
    };
}

export const appendJsonSnake = (fd: FormData, name: string, value: unknown) => {
    const snake = snakecaseKeys(value as any, { deep: true });
    fd.append(name, JSON.stringify(snake) as any);
};