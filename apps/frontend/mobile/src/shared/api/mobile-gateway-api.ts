import { ClubApi } from "@/src/modules/club/api/club-api";
import { MatchApi } from "@/src/modules/match/api/match-api";
import { PoolApi } from "@/src/modules/pool/api/pool-api";
import { TeamApi } from "@/src/modules/team/api/team-api";
import { UserApi } from "@/src/modules/user/api/user-api";
import { SearchApi } from "@/src/modules/search/api/search-api";
import { NotificationApi } from "@/src/modules/notifications/api/notification-api";
import { ConfigApi } from "@/src/modules/config/api/config-api";
import { ReportApi } from "@/src/modules/report/api/report-api";
import { ApiError } from "@/src/shared/api/api-error";
import { setMobileGatewayAuthContext } from "@/src/shared/api/orval-fetch";
import type { TokenSupplier } from "@/src/shared/api/orval-fetch";

/** Group feature adapters for the generated mobile-gateway client. */
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

  /** Create the stable feature API adapters exposed through React context. */
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

  /** Configure authentication shared by generated secure operations. */
  public setAuthContext(
    tokenSupplier?: TokenSupplier,
    onUnauthorized?: (e: ApiError) => void | Promise<void>,
  ) {
    setMobileGatewayAuthContext(tokenSupplier, onUnauthorized);
  }
}
