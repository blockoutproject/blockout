import {ClubApi} from "./ClubApi";
import {MatchApi} from "./MatchApi";
import {PoolApi} from "./PoolApi";
import {TeamApi} from "./TeamApi";
import {UserApi} from "./UserApi";
import {SearchApi} from "./SearchApi";
import {NotificationApi} from "@/src/modules/notifications/api/NotificationApi";
import {ConfigApi} from "./ConfigApi";
import {ReportApi} from "@/src/modules/report/api/ReportApi";
import {TokenSupplier} from "@/src/shared/api/HttpClient";
import {ApiError} from "@/src/shared/api/ApiError";

export class MobileGatewayApi {
  public clubs: ClubApi;
  public matches: MatchApi;
  public pools: PoolApi;
  public teams: TeamApi;
  public users: UserApi;
  public search: SearchApi;
  public notifications: NotificationApi;
  public config: ConfigApi;
  public reports: ReportApi;

  constructor() {
    this.clubs = new ClubApi();
    this.matches = new MatchApi();
    this.pools = new PoolApi();
    this.teams = new TeamApi();
    this.users = new UserApi();
    this.search = new SearchApi();
    this.notifications = new NotificationApi();
    this.config = new ConfigApi();
    this.reports = new ReportApi();
  }

  // Pour que setAuthOnApis continue à fonctionner comme avant
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
    this.config.setAuthContext(tokenSupplier, onUnauthorized);
    this.reports.setAuthContext(tokenSupplier, onUnauthorized);
  }
}
