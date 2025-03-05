export function formatDateFrenchLocale(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}