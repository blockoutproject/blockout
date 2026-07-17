import { ClubApi } from './ClubApi';
import { MatchApi } from './MatchApi';
import { PoolApi } from './PoolApi';
import { TeamApi } from './TeamApi';
import { UserApi } from './UserApi';
import { SearchApi } from './SearchApi';
import { NotificationApi } from './NotificationApi';
import { ReportApi } from './ReportApi';
import { TokenSupplier } from '@/src/api/core/HttpClient';
import { ApiError } from '@/src/api/core/ApiError';

/** Retains the handwritten resource clients whose generated caller tasks are still pending. */
export class MobileGatewayApi {
  public clubs: ClubApi;
  public matches: MatchApi;
  public pools: PoolApi;
  public teams: TeamApi;
  public users: UserApi;
  public search: SearchApi;
  public notifications: NotificationApi;
  public reports: ReportApi;

  /** Creates the remaining handwritten resource clients once for the application provider. */
  constructor() {
    this.clubs = new ClubApi();
    this.matches = new MatchApi();
    this.pools = new PoolApi();
    this.teams = new TeamApi();
    this.users = new UserApi();
    this.search = new SearchApi();
    this.notifications = new NotificationApi();
    this.reports = new ReportApi();
  }

  /**
   * Propagates the session token and unauthorized callback to remaining handwritten clients.
   *
   * @param tokenSupplier authenticated access-token supplier.
   * @param onUnauthorized shared unauthorized-session callback.
   */
  public setAuthContext(
    tokenSupplier?: TokenSupplier,
    onUnauthorized?: (e: ApiError) => void | Promise<void>,
  ) {
    this.clubs.setAuthContext(tokenSupplier, onUnauthorized);
    this.matches.setAuthContext(tokenSupplier, onUnauthorized);
    this.pools.setAuthContext(tokenSupplier, onUnauthorized);
    this.teams.setAuthContext(tokenSupplier, onUnauthorized);
    this.users.setAuthContext(tokenSupplier, onUnauthorized);
    this.search.setAuthContext(tokenSupplier, onUnauthorized);
    this.notifications.setAuthContext(tokenSupplier, onUnauthorized);
    this.reports.setAuthContext(tokenSupplier, onUnauthorized);
  }
}
