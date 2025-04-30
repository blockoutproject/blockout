import { parseISO, format, Locale } from 'date-fns';
import { fr } from 'date-fns/locale';

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