import { AdministrationApi } from "@/src/modules/administration/api/administration-api";
import { AppStatusApi } from "@/src/modules/app-status/api/app-status-api";
import { ClubApi } from "@/src/modules/club/api/club-api";
import { DivisionApi } from "@/src/modules/division/api/division-api";
import { LegalApi } from "@/src/modules/legal/api/legal-api";
import { MatchApi } from "@/src/modules/match/api/match-api";
import { NotificationApi } from "@/src/modules/notifications/api/notification-api";
import { PoolApi } from "@/src/modules/pool/api/pool-api";
import { RawDivisionMappingApi } from "@/src/modules/raw-division-mapping/api/raw-division-mapping-api";
import { ReportApi } from "@/src/modules/report/api/report-api";
import { SearchApi } from "@/src/modules/search/api/search-api";
import { TeamApi } from "@/src/modules/team/api/team-api";
import { UserApi } from "@/src/modules/user/api/user-api";
import { ApiError } from "@/src/shared/api/api-error";
import { setMobileGatewayAuthContext } from "@/src/shared/api/orval-fetch";
import type { TokenSupplier } from "@/src/shared/api/orval-fetch";

/** Group feature adapters for the generated mobile-gateway client. */
export class MobileGatewayApi {
  public administration: AdministrationApi;
  public appStatus: AppStatusApi;
  public clubs: ClubApi;
  public divisions: DivisionApi;
  public legal: LegalApi;
  public matches: MatchApi;
  public notifications: NotificationApi;
  public pools: PoolApi;
  public rawDivisionMappings: RawDivisionMappingApi;
  public reports: ReportApi;
  public search: SearchApi;
  public teams: TeamApi;
  public users: UserApi;

  /** Create the stable feature API adapters exposed through React context. */
  constructor() {
    this.administration = new AdministrationApi();
    this.appStatus = new AppStatusApi();
    this.clubs = new ClubApi();
    this.divisions = new DivisionApi();
    this.legal = new LegalApi();
    this.matches = new MatchApi();
    this.notifications = new NotificationApi();
    this.pools = new PoolApi();
    this.rawDivisionMappings = new RawDivisionMappingApi();
    this.reports = new ReportApi();
    this.search = new SearchApi();
    this.teams = new TeamApi();
    this.users = new UserApi();
  }

  /** Configure authentication shared by generated secure operations. */
  public setAuthContext(
    tokenSupplier?: TokenSupplier,
    onUnauthorized?: (e: ApiError) => void | Promise<void>,
  ) {
    setMobileGatewayAuthContext(tokenSupplier, onUnauthorized);
  }
}
