import { useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { EnrichedUserNotificationPage } from "@/src/types/Notification";
import { useApis } from "@/src/context/ApiProvider";

const NOTIFS_QK = (pageSize: number) => ["notifications", "enriched", `size:${pageSize}`] as const;

export function useDeleteNotification(pageSize = 20) {
    const qc = useQueryClient();
    const { mobile } = useApis();

    return useMutation({
        mutationFn: async (id: number) => {
            await mobile.deleteNotification(id);
        },
        onMutate: async (id: number) => {
            const key = NOTIFS_QK(pageSize);
            // Annule les fetchs en cours pour éviter d’écraser notre maj optimiste
            await qc.cancelQueries({ queryKey: key });

            // Snapshot de l’état courant pour rollback si erreur
            const previous = qc.getQueryData<InfiniteData<EnrichedUserNotificationPage>>(key);

            // Maj optimiste : on retire l’item de toutes les pages
            qc.setQueryData<InfiniteData<EnrichedUserNotificationPage>>(key, (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((p) => ({
                        ...p,
                        notifications: p.notifications.filter((n) => n.id !== id),
                    })),
                };
            });

            return { previous, key };
        },
        onError: (_err, _id, ctx) => {
            // Rollback si l’API a échoué
            if (ctx?.previous && ctx.key) {
                qc.setQueryData(ctx.key, ctx.previous);
            }
        },
        onSettled: (_data, _err, _id, _ctx) => {
            // Petite invalidation silencieuse pour resynchroniser (pagination, nextPage, etc.)
            if (_ctx?.key) {
                qc.invalidateQueries({ queryKey: _ctx.key });
            }
            // Facultatif : invalider aussi le compteur d’unread si tu as une query dédiée
            // qc.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
        },
    });
}