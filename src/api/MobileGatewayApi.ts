import { CONFIG } from "@/src/config/config";
import { EnrichedDayPageDTO, EnrichedMatchDTO, MatchStatus } from "@/src/types/Match";
import { EnrichedPoolDTO, Pool, PoolSearchDocDTO, PoolSummaryDTO } from "@/src/types/Pool";
import { EnrichedTeamDTO, Team, TeamSearchDocDTO, TeamSummaryDTO } from "@/src/types/Team";
import { EnrichedUserNotificationPage, RegisterPushTokenRequest } from "@/src/types/Notification";
import { CustomUser } from "../types/User";
import { Club, ClubSearchDocDTO } from "../types/Club";
import { BaseApi } from "./core/BaseApi";
import { Division } from "../types/Division";
import { RawDivisionMapping } from "../types/RawDivisionMapping";
import { ScraperStatus } from "../types/ScraperStatus";
import { GitHubIssueResponse } from "../types/Report";
import { LegalDocument } from "../types/LegalDocument";

export class MobileGatewayApi extends BaseApi {
    constructor() {
        super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
    }

    /**
     * Récupère le détail d’un club (public)
     * @param id Identifiant du club
     */
    public getClubById(id: string) {
        return this.httpPublic.get<Club>(`/clubs/${id}`);
    }

    /**
     * Met à jour un club (authentifié)
     * @param data Données de mise à jour du club
     * @param image Image optionnelle du club
     */
    public updateClub(
        data: Partial<Club>,
        image?: { uri: string; type: string; name: string },
    ) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        if (image) {
            formData.append("image", {
                uri: image.uri,
                type: image.type,
                name: image.name,
            } as any);
        }

        return this.httpAuth.put<Club>("/clubs", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    /**
     * Récupère une page de matches enrichis (public)
     * @param page Numéro de page
     * @param size Taille de page
     * @param poolIds Liste d’identifiants de poules
     * @param teamIds Liste d’identifiants d’équipes
     * @param status Statut du match
     */
    public getEnrichedMatches(params: {
        page?: number;
        size?: number;
        poolIds?: number[];
        teamIds?: number[];
        status: MatchStatus;
    }) {
        return this.httpPublic.get<EnrichedDayPageDTO>("/matches", { params });
    }

    /**
     * Récupère le détail d’un match enrichi (public)
     * @param id Identifiant du match
     */
    public getEnrichedMatchById(id: number) {
        return this.httpPublic.get<EnrichedMatchDTO>(`/matches/${id}`);
    }

    /**
     * Récupère le détail d’un pool enrichi (public)
     * @param id Identifiant du pool
     */
    public getEnrichedPoolById(id: number) {
        return this.httpPublic.get<EnrichedPoolDTO>(`/pools/${id}`);
    }

    /**
     * Récupère le détail d’une équipe enrichie (public)
     * @param id Identifiant de l’équipe
     */
    public getEnrichedTeamById(id: number) {
        return this.httpPublic.get<EnrichedTeamDTO>(`/teams/${id}`);
    }

    /**
     * Récupère la liste des équipes d’un club (public)
     * @param id Identifiant du club
     */
    public getTeamListByClubId(id: string) {
        return this.httpPublic.get<TeamSummaryDTO[]>(`/teams/by-club/${id}`);
    }

    /**
     * Récupère des équipes par leurs identifiants (public)
     * @param ids Liste d’identifiants d’équipes
     */
    public getTeamListByIds(ids: number[]) {
        return this.httpPublic.get<TeamSummaryDTO[]>("/teams/by-ids", { params: { ids } });
    }

    /**
     * Récupère des poules par leurs identifiants (public)
     * @param ids Liste d’identifiants de poules
     */
    public getPoolListByIds(ids: number[]) {
        return this.httpPublic.get<PoolSummaryDTO[]>("/pools/by-ids", { params: { ids } });
    }

    /**
     * Crée ou met à jour l’utilisateur courant (authentifié)
     */
    public ensureCurrentUser(): Promise<CustomUser> {
        return this.httpAuth.put<CustomUser>("/users/me");
    }

    /**
     * Met à jour un utilisateur spécifique (authentifié)
     * @param auth0Id Identifiant Auth0
     * @param data Données de mise à jour
     * @param image Image optionnelle
     */
    public updateUser(
        auth0Id: string,
        data: Partial<CustomUser>,
        image?: { uri: string; type: string; name: string },
    ): Promise<CustomUser> {
        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        if (image) {
            formData.append("image", {
                uri: image.uri,
                type: image.type,
                name: image.name,
            } as any);
        }

        return this.httpAuth.put<CustomUser>(`/users/${auth0Id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    /**
     * Supprime l’utilisateur courant (authentifié)
     */
    public deleteCurrentUser(): Promise<void> {
        return this.httpAuth.delete<void>("/users/me");
    }

    /**
     * Recherche des clubs (public)
     * @param query Chaîne de recherche
     */
    public searchClubs(query: string) {
        return this.httpPublic.get<ClubSearchDocDTO[]>("/search/clubs", {
            params: { query },
        });
    }

    /**
     * Recherche des poules (public)
     * @param query Chaîne de recherche
     */
    public searchPools(query: string) {
        return this.httpPublic.get<PoolSearchDocDTO[]>("/search/pools", {
            params: { query },
        });
    }

    /**
     * Recherche des équipes (public)
     * @param query Chaîne de recherche
     */
    public searchTeams(query: string) {
        return this.httpPublic.get<TeamSearchDocDTO[]>("/search/teams", {
            params: { query },
        });
    }

    /**
     * Récupère la liste des notifications enrichies (authentifié)
     * @param page Numéro de page
     * @param size Taille de page
     */
    public getNotifications(params: { page?: number; size?: number } = {}) {
        const { page = 0, size } = params;
        return this.httpAuth.get<EnrichedUserNotificationPage>("/notifications", {
            params: { page, size },
        });
    }

    /**
     * Récupère le nombre de notifications non lues (authentifié)
     */
    public getUnreadNotificationsCount() {
        return this.httpAuth.get<{ count: number }>("/notifications/unread-count");
    }

    /**
     * Marque une notification comme lue (authentifié)
     * @param id Identifiant de la notification
     */
    public markNotificationRead(id: number) {
        return this.httpAuth.post<void>(`/notifications/${id}/read`);
    }

    /**
     * Marque une notification comme ouverte (authentifié)
     * @param id Identifiant de la notification
     */
    public markNotificationOpened(id: number) {
        return this.httpAuth.post<void>(`/notifications/${id}/opened`);
    }

    /**
     * Supprime une notification (authentifié)
     * @param id Identifiant de la notification
     */
    public deleteNotification(id: number) {
        return this.httpAuth.delete<void>(`/notifications/${id}`);
    }

    /**
     * Enregistre un push token pour un utilisateur (authentifié)
     * @param userId Identifiant de l’utilisateur
     * @param req Objet contenant le token et le device
     */
    public registerPushToken(userId: number, payload: RegisterPushTokenRequest) {
        return this.httpAuth.post<void>(`/notifications/users/${userId}/push-tokens`, payload);
    }

    /**
     * Met à jour une pool existante
     * @param id Identifiant de la pool
     * @param data Données de mise à jour
     */
    public updatePool(id: number, data: Partial<Pool>) {
        return this.httpAuth.put<Pool>(`/pools/${id}`, data);
    }

    /**
     * Met à jour une équipe existante
     * @param id Identifiant de l’équipe
     * @param data Données de mise à jour
     */
    public updateTeam(id: number, data: Partial<Team>) {
        return this.httpAuth.put<Team>(`/teams/${id}`, data);
    }

    /**
     * Suit une entité (ajoute aux favoris)
     * @param entityType Type d’entité (TEAM, CLUB, POOL, etc.)
     * @param entityId Identifiant de l’entité
     */
    public follow(entityType: string, entityId: number) {
        return this.httpAuth.post<void>("/favorites/follow", null, {
            params: { entity_type: entityType, entity_id: entityId },
        });
    }

    /**
     * Ne suit plus une entité (retire des favoris)
     * @param entityType Type d’entité (TEAM, CLUB, POOL, etc.)
     * @param entityId Identifiant de l’entité
     */
    public unfollow(entityType: string, entityId: number) {
        return this.httpAuth.delete<void>("/favorites/follow", {
            params: { entity_type: entityType, entity_id: entityId },
        });
    }

    /**
 * Récupère toutes les divisions (public)
 */
    public getDivisions() {
        return this.httpPublic.get<Division[]>("/config/divisions");
    }

    /**
     * Récupère une division par son identifiant (public)
     * @param id Identifiant de la division
     */
    public getDivisionById(id: number) {
        return this.httpPublic.get<Division>(`/config/divisions/${id}`);
    }

    /**
     * Récupère un document légal (public)
     * @param type Type du document (terms | privacy | imprint)
     */
    public getLegalDocument(type: string) {
        return this.httpPublic.get<LegalDocument>(
            `/config/legal/${type}`,
        );
    }

    /**
     * Met à jour un document légal (authentifié)
     * @param type Type du document (terms, privacy, imprint)
     * @param data Données du document
     */
    public updateLegalDocument(type: string, data: Partial<LegalDocument>) {
        return this.httpAuth.put<Partial<LegalDocument>>(`/config/legal/${type}`, data);
    }

    /**
     * Crée une division (authentifié)
     * @param data Données de la division
     * @param image Image optionnelle
     */
    public createDivision(
        data: Partial<Division>,
        image?: { uri: string; type: string; name: string },
    ) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        if (image) {
            formData.append("image", {
                uri: image.uri,
                type: image.type,
                name: image.name,
            } as any);
        }
        return this.httpAuth.post<Division>("/config/divisions", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    /**
     * Désactive une division (authentifié)
     * @param id Identifiant de la division
     */
    public deactivateDivision(id: number) {
        return this.httpAuth.delete<void>(`/config/divisions/${id}`);
    }

    /**
     * Récupère la liste des RawDivisionMappings (authentifié)
     * @param leagueCode Code de ligue (optionnel)
     * @param season Saison (optionnel)
     */
    public getRawDivisionMappings(leagueCode?: string, season?: string) {
        return this.httpAuth.get<any[]>("/config/raw-divisions", {
            params: { league_code: leagueCode, season },
        });
    }

    /**
     * Récupère un RawDivisionMapping par ID (authentifié)
     * @param id Identifiant du mapping
     */
    public getRawDivisionMappingById(id: number) {
        return this.httpAuth.get<any>(`/config/raw-divisions/${id}`);
    }

    /**
     * Crée un RawDivisionMapping (authentifié)
     * @param data Données du mapping
     */
    public createRawDivisionMapping(data: Partial<RawDivisionMapping>) {
        return this.httpAuth.post<any>("/config/raw-divisions", data);
    }

    /**
     * Met à jour un RawDivisionMapping (authentifié)
     * @param id Identifiant du mapping
     * @param data Données à mettre à jour
     */
    public updateRawDivisionMapping(id: number, data: Partial<RawDivisionMapping>) {
        return this.httpAuth.put<RawDivisionMapping>(`/config/raw-divisions/${id}`, data);
    }

    /**
     * Met à jour l’état d’un scraper (authentifié)
     * @param name Nom du scraper
     * @param enabled État à appliquer
     */
    public updateScraperStatus(name: string, enabled: boolean) {
        return this.httpAuth.put<ScraperStatus>(
            `/config/scrapers/${name}/enabled`,
            null,
            { params: { enabled } },
        );
    }

    /**
     * Récupère la liste de tous les scrapers avec leur statut (authentifié)
     */
    public getScraperStatuses() {
        return this.httpAuth.get<ScraperStatus[]>("/config/scrapers/status");
    }

    /**
     * Crée un rapport (authentifié)
     * @param data Données du rapport
     * @param images Liste d’images optionnelles
     */
    public createReport(
        data: Record<string, any>,
        images?: { uri: string; type: string; name: string }[],
    ) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        if (images && images.length > 0) {
            images.forEach((img) => {
                formData.append("images", {
                    uri: img.uri,
                    type: img.type,
                    name: img.name,
                } as any);
            });
        }

        return this.httpAuth.post<GitHubIssueResponse>("/reports", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }
}