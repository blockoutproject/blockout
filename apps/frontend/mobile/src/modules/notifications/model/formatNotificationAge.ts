export function formatNotificationAge(iso?: string | null): string {
  if (!iso) return "";

  const difference = Date.now() - new Date(iso).getTime();
  if (difference < 60_000) return "à l’instant";

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  return `il y a ${Math.floor(hours / 24)} j`;
}
