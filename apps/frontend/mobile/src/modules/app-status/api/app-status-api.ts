import { getAppStatus } from "@/src/shared/generated/endpoints/config-public";
import { updateAppStatus } from "@/src/shared/generated/endpoints/config-secure";
import type { UpdateAppStatusRequest } from "@/src/shared/generated/models";

/** Expose application-status operations through the feature API boundary. */
export class AppStatusApi {
  /** Load the public application status. */
  public getAppStatus() {
    return getAppStatus();
  }

  /** Update the application status. */
  public updateAppStatus(data: UpdateAppStatusRequest) {
    return updateAppStatus(data);
  }
}
