import { ClubApi } from "@/src/modules/club/api/ClubApi";
import { MatchApi } from "@/src/modules/match/api/MatchApi";
import { PoolApi } from "@/src/modules/pool/api/PoolApi";
import { TeamApi } from "@/src/modules/team/api/TeamApi";
import { UserApi } from "@/src/modules/user/api/UserApi";
import { SearchApi } from "@/src/modules/search/api/SearchApi";
import { NotificationApi } from "@/src/modules/notifications/api/NotificationApi";
import { ConfigApi } from "@/src/modules/config/api/ConfigApi";
import { ReportApi } from "@/src/modules/report/api/ReportApi";
import { ApiError } from "@/src/shared/api/ApiError";
import { setMobileGatewayAuthContext } from "@/src/shared/api/orvalFetch";
import type { TokenSupplier } from "@/src/shared/api/orvalFetch";

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
